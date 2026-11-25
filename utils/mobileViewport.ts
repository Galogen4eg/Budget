export function keyboardViewport(input:{mobile:boolean;editable:boolean;scale:number;baseline:number;height:number}):{keyboardOpen:boolean;height:number|null} {
 const open=input.mobile&&input.editable&&Math.abs(input.scale-1)<0.02&&Number.isFinite(input.height)&&input.height>0&&Number.isFinite(input.baseline)&&input.baseline-input.height>120;
 return {keyboardOpen:open,height:open?Math.floor(input.height):null};
}
