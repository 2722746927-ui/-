'use client';
import { useEffect,useRef,type ReactNode } from 'react';
const focusable='button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]';
/** Modal focus stays inside; Escape, overlay and close actions all restore focus. */
export default function Dialog({children,titleId,onClose,small=false}:{children:ReactNode;titleId:string;onClose:()=>void;small?:boolean}){
 const ref=useRef<HTMLElement>(null);const closeRef=useRef(onClose);closeRef.current=onClose;
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  const panel=ref.current;const first=panel?.querySelector<HTMLElement>(focusable);(first||panel)?.focus();
  function keydown(event:KeyboardEvent){if(event.key==='Escape'){event.preventDefault();closeRef.current();}if(event.key==='Tab'){
   const items=Array.from(panel?.querySelectorAll<HTMLElement>(focusable)||[]);const first=items[0],last=items.at(-1);
   if(!first){event.preventDefault();panel?.focus();}else if(event.shiftKey&&(document.activeElement===first||document.activeElement===panel)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }}
  document.addEventListener('keydown',keydown);return()=>{document.removeEventListener('keydown',keydown);document.body.style.overflow=oldOverflow;previous?.focus();};
 },[]);
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section ref={ref} tabIndex={-1} className={`modal ${small?'small-modal':''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>{children}</section></div>;
}
