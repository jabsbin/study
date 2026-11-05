// User-requested one-time reset. Never use Date.now() here: later posts must survive.
export const GUESTBOOK_RESET_BEFORE=Date.parse('2026-11-05T08:50:19Z');
export const GUESTBOOK_RESET_MARKER='maintenance:guestbook-reset-20261105T085019Z';

export async function clearRequestedGuestbook(storage){
  if(await storage.get(GUESTBOOK_RESET_MARKER))return;
  let cursor;
  while(true){
    const rows=await storage.list({prefix:'book:',limit:100,...(cursor?{startAfter:cursor}:{})});
    if(!rows.size)break;
    await storage.transaction(async tx=>{
      for(const [key,entry] of rows){
        if(!Number.isFinite(entry.createdAt)||entry.createdAt>GUESTBOOK_RESET_BEFORE)continue;
        await tx.delete(key);
        // Keep only a deletion receipt so a delayed post retry cannot restore the text.
        await tx.put('book-id:'+entry.id,{id:entry.id,sequence:entry.sequence,ownerHash:entry.ownerHash||null,deleted:true});
      }
    });
    cursor=[...rows.keys()].at(-1);
    if(rows.size<100)break;
  }
  await storage.put(GUESTBOOK_RESET_MARKER,true);
}
