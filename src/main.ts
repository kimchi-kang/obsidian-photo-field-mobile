import {Plugin,WorkspaceLeaf,Notice,normalizePath,TFolder} from 'obsidian';
import {Inputs,Saved} from './model';
import {restore,snapshot} from './storage';
import {LatestWriter} from './writer';
import {applyEquipment,selectedEquipment,setGnMode} from './presets';
import {PhotoView,VIEW} from './view';
import {note,validateNote} from './note';
export default class PhotoPlugin extends Plugin {
  state!:Saved;
  private writer!:LatestWriter<Saved>;
  private notes:Promise<unknown>=Promise.resolve();
  saveError='';private noteNotice?:Notice;
  private active=false;
  private stableInputs!:Inputs;
  private opening:Promise<void>|null=null;
  async onload():Promise<void> {
    this.state=restore(await this.loadData());this.stableInputs={...this.state.inputs};this.active=true;
    this.writer=new LatestWriter(data=>this.saveData(data),()=>{if(this.writer.error&&!this.saveError)this.report(this.writer.error);this.saveError=this.writer.error?`설정 저장 실패: ${this.writer.error instanceof Error?this.writer.error.message:String(this.writer.error)} · 다시 저장하세요.`:'';for(const leaf of this.app.workspace.getLeavesOfType(VIEW))if(leaf.view instanceof PhotoView)leaf.view.updateSaveStatus();});
    const flush=()=>{void this.flush().catch(e=>this.reportSaveError(e));};
    this.registerDomEvent(document,'visibilitychange',()=>{if(document.visibilityState==='hidden')flush();});
    this.registerDomEvent(window,'pagehide',flush);
    this.registerView(VIEW,(leaf:WorkspaceLeaf)=>new PhotoView(leaf,this));
    this.addCommand({id:'open',name:'촬영 계산 열기',icon:'camera',callback:()=>{void this.open().catch(e=>this.report(e));}});
    this.addCommand({id:'save-note',name:'현재 계산을 노트로 저장',callback:()=>{void this.saveNote().catch(e=>this.report(e));}});
    this.addRibbonIcon('camera','사진 촬영 도우미 열기',()=>{void this.open().catch(e=>this.report(e));});
  }
  report(e:unknown):void {console.error('Photo Field Mobile',e);new Notice(`사진 촬영 도우미: ${e instanceof Error?e.message:String(e)}`);}
  open():Promise<void> {
    if(this.opening)return this.opening;
    this.opening=this.openView().finally(()=>{this.opening=null;});return this.opening;
  }
  private async openView():Promise<void> {
    // Obsidian replaces the last detached leaf on the next event-loop turn.
    await new Promise<void>(resolve=>window.setTimeout(resolve,0));
    if(!this.active)return;
    let leaf=this.app.workspace.getLeavesOfType(VIEW)[0];
    if(!leaf){leaf=this.app.workspace.getLeaf(false);await leaf.setViewState({type:VIEW,active:true});}
    if(this.active)await this.app.workspace.revealLeaf(leaf);
  }
  persist():Promise<void> {
    const data=snapshot(this.state,this.stableInputs);this.stableInputs={...data.inputs};return this.writer.request(data);
  }
  async flush():Promise<void>{if(this.writer)await this.writer.flush();}
  reportSaveError(e:unknown):void {if(!this.saveError){this.saveError='설정 저장 실패 · 다시 저장하세요.';this.report(e);}for(const leaf of this.app.workspace.getLeavesOfType(VIEW))if(leaf.view instanceof PhotoView)leaf.view.updateSaveStatus();}
  refresh(source:PhotoView):void {for(const leaf of this.app.workspace.getLeavesOfType(VIEW))if(leaf.view instanceof PhotoView&&leaf.view!==source)leaf.view.render();}
  saveNote():Promise<string> {
    const i={...this.state.inputs},equipment=selectedEquipment(this.state);
    let content:string;try{validateNote(i);content=note(i,new Date(),{version:this.manifest.version,equipment});}catch(e){return Promise.reject(e);}
    const task=this.notes.catch(()=>undefined).then(async()=>{
      const folder=normalizePath('사진 촬영 계산');
      if(!this.app.vault.getAbstractFileByPath(folder))try{await this.app.vault.createFolder(folder);}catch(e){if(!(this.app.vault.getAbstractFileByPath(folder) instanceof TFolder))throw e;}
      if(!(this.app.vault.getAbstractFileByPath(folder) instanceof TFolder))throw Error('저장 폴더 경로에 파일이 있습니다. 다른 이름으로 옮겨주세요.');
      const base=`${folder}/촬영 계산 ${new Date().toISOString().replace(/[:.]/g,'-')}`;
      for(let n=0;n<1000;n++){
        const path=`${base}${n?'-'+n:''}.md`;if(this.app.vault.getAbstractFileByPath(path))continue;
        try{await this.app.vault.create(path,content);this.noteNotice?.hide();this.noteNotice=new Notice(`저장 완료: ${path}`,2500);return path;}catch(e){if(!this.app.vault.getAbstractFileByPath(path))throw e;}
      }throw Error('새 노트 이름을 확보하지 못했습니다. 다시 저장하세요.');
    });this.notes=task;return task;
  }
  update<K extends keyof Inputs>(key:K,value:Inputs[K]):void {if(key==='gnMode'){setGnMode(this.state,value as Inputs['gnMode']);return;}this.state.inputs[key]=value;if(key==='zoom')applyEquipment(this.state);
    if(['gn','gnZoom','conditions','steps','minDenominator'].includes(key)&&this.state.inputs.gnMode==='equipment'){this.state.inputs.gnMode='manual';}}
  onunload():void {this.active=false;this.noteNotice?.hide();void this.flush().catch(e=>this.reportSaveError(e));this.app.workspace.detachLeavesOfType(VIEW);}
}
