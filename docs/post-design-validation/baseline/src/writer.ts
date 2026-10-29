/** Bounded coalescing: first edit starts an 80ms window; later edits never extend it. */
export class LatestWriter<T> {
  private pending?:T;private timer?:ReturnType<typeof setTimeout>;private running?:Promise<void>;
  private waiting?:{promise:Promise<void>;resolve:()=>void;reject:(e:unknown)=>void};
  error:unknown=null;
  constructor(private write:(data:T)=>Promise<void>,private status:()=>void=()=>{}){}
  request(data:T):Promise<void>{
    this.pending=data;
    if(!this.waiting){let resolve!:()=>void,reject!:(e:unknown)=>void;const promise=new Promise<void>((a,b)=>{resolve=a;reject=b;});this.waiting={promise,resolve,reject};}
    if(!this.timer&&!this.running)this.timer=setTimeout(()=>{this.timer=undefined;void this.flush().catch(()=>{});},80);
    return this.waiting.promise;
  }
  async flush():Promise<void>{
    if(this.timer){clearTimeout(this.timer);this.timer=undefined;}
    if(this.running){await this.running;if(this.pending!==undefined)await this.flush();return;}
    if(this.pending===undefined)return;
    const data=this.pending,waiting=this.waiting;this.pending=undefined;this.waiting=undefined;
    this.running=Promise.resolve().then(()=>this.write(data)).then(()=>{this.error=null;waiting?.resolve();},e=>{if(this.pending===undefined)this.pending=data;this.error=e;waiting?.reject(e);throw e;});
    try{await this.running;}finally{this.running=undefined;this.status();}
    if(this.pending!==undefined)await this.flush();
  }
}
