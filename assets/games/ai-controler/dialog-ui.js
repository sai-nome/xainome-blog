/* Dialog backdrop dismissal. Dragging content out of a dialog never dismisses it. */
(function(root) {
  'use strict';
  function outside(dialog,event) {
    if(event.target!==dialog) return false;
    const r=dialog.getBoundingClientRect();
    return event.clientX<r.left || event.clientX>=r.right || event.clientY<r.top || event.clientY>=r.bottom;
  }
  function install(document) {
    for(const dialog of document.querySelectorAll('dialog')) {
      let pressedOutside=false;
      dialog.addEventListener('pointerdown',event=>{ pressedOutside=event.button===0 && outside(dialog,event); });
      dialog.addEventListener('pointercancel',()=>{ pressedOutside=false; });
      dialog.addEventListener('close',()=>{ pressedOutside=false; });
      dialog.addEventListener('click',event=>{
        const dismiss=pressedOutside && outside(dialog,event); pressedOutside=false;
        if(dialog.open && dismiss) dialog.close();
      });
    }
  }
  const api={outside,install};
  if(typeof module==='object' && module.exports) module.exports=api; else root.EmpireDialogs=api;
})(typeof globalThis!=='undefined' ? globalThis : this);
