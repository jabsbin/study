export const CLAP_DURATION=3000;
export const CLAP_RETURN=400;
export function clapFacing(from,to,age){
  const ease=t=>{const value=Math.max(0,Math.min(1,t));return value*value*(3-2*value);};
  const weight=age<CLAP_DURATION?ease(age/240):1-ease((age-CLAP_DURATION)/CLAP_RETURN);
  return from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*weight;
}
