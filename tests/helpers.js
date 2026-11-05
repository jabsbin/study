export async function walk(page,x,z){
  console.log('Walking to',x,z);
  for(const [axis,target] of [['x',x],['z',z]]){
    const before=await page.evaluate(()=>window.__garden.position);
    const delta=target-before[axis];if(Math.abs(delta)<.6)continue;
    const sign=Math.sign(delta),key=axis==='x'?(sign>0?'d':'a'):(sign>0?'s':'w');
    await page.keyboard.down(key);
    try{await page.waitForFunction(({axis,target,sign})=>sign*(window.__garden.position[axis]-target)>=-.4,{axis,target,sign},{polling:'raf',timeout:45000});}
    catch(error){console.log('Stopped at',await page.evaluate(()=>window.__garden.position));throw error;}finally{await page.keyboard.up(key);}
  }
}

