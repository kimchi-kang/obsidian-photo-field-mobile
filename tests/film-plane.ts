// Independent film-plane oracle for the tests. It does not use the production closed form:
// the lens extension v (lens → film) for a focus distance D (film → subject) is found by bisection on 1/(D−v)+1/v=1/f.
export function extension(D:number,f:number):number {
  if(!(D>=4*f))throw Error('closer than 1:1');
  let lo=f,hi=D/2;for(let k=0;k<200;k++){const v=(lo+hi)/2;if(1/(D-v)+1/v-1/f>0)lo=v;else hi=v;}
  return (lo+hi)/2;
}
/** Blur-circle diameter on the film for a subject U from the film plane, lens focused at D from the film plane (mm). */
export function filmBlur(f:number,N:number,D:number,U:number):number {
  const vs=extension(D,f),u=U-vs,v=1/(1/f-1/u);return f/N*Math.abs(1-vs/v);
}
