import {Plugin,WorkspaceLeaf,Notice,normalizePath} from 'obsidian';
import {Inputs,Saved} from './model';
import {restore,snapshot} from './storage';
import {PhotoView,VIEW} from './view';
import {note} from './note';
export default class PhotoPlugin extends Plugin {
  state!:Saved;
  private writes:Promise<void>=Promise.resolve();
  private active=false;
  private stableInputs!:Inputs;
  private opening:Promise<void>|null=null;
  async onload():Promise<void> {
    this.state=restore(await this.loadData());this.stableInputs={...this.state.inputs};this.active=true;
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
    const data=snapshot(this.state,this.stableInputs);
    this.stableInputs={...data.inputs};
    const task=this.writes.catch(()=>undefined).then(()=>this.saveData(data));this.writes=task;return task;
  }
  refresh(source:PhotoView):void {for(const leaf of this.app.workspace.getLeavesOfType(VIEW))if(leaf.view instanceof PhotoView&&leaf.view!==source)leaf.view.render();}
  async saveNote():Promise<string> {
    const i={...this.state.inputs};
    if(Object.values(i).some(v=>typeof v==='number'&&!Number.isFinite(v)))throw Error('빈 값이나 잘못된 숫자를 먼저 수정하세요.');
    const folder=normalizePath('사진 촬영 계산');
    if(!this.app.vault.getAbstractFileByPath(folder))await this.app.vault.createFolder(folder);
    const base=`${folder}/촬영 계산 ${new Date().toISOString().replace(/[:.]/g,'-')}`;
    let path=`${base}.md`,n=1;
    while(this.app.vault.getAbstractFileByPath(path))path=`${base}-${n++}.md`;
    await this.app.vault.create(path,note(i));new Notice(`저장 완료: ${path}`);return path;
  }
  update<K extends keyof Inputs>(key:K,value:Inputs[K]):void {this.state.inputs[key]=value;}
  onunload():void {this.active=false;this.app.workspace.detachLeavesOfType(VIEW);}
}
