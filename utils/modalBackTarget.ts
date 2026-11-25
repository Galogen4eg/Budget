/** A browser Back event can dismiss at most the top registered modal. */
export function modalBackTarget(activeIds:readonly string[],destinationId:unknown):string|null {
 const top=activeIds[activeIds.length-1];
 return top&&top!==destinationId?top:null;
}
