/** Human-readable serialization; legacy answers remain readable. */
export function encodeChoice(selected:string[],detail:string){
  return [...selected.map(value=>`- ${value}`),...(detail.trim()?[`补充：${detail}`]:[])].join('\n');
}
export function decodeChoice(answer:string,options:string[]){
  if(answer.startsWith('- ')){
    const marker=answer.indexOf('\n补充：');
    const choices=marker<0?answer:answer.slice(0,marker);
    return {selected:choices.split('\n').map(line=>line.slice(2)).filter(value=>options.includes(value)),detail:marker<0?'':answer.slice(marker+4)};
  }
  if(answer.startsWith('补充：'))return{selected:[],detail:answer.slice(3)};
  const marker=answer.indexOf('\n补充：');
  const choices=marker<0?answer:answer.slice(0,marker);
  const selected=options.includes(choices)?[choices]:choices.split('、').filter(value=>options.includes(value));
  return{selected,detail:marker>=0?answer.slice(marker+4):selected.length?'':answer};
}
