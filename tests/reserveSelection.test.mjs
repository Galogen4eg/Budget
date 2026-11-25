import test from 'node:test';
import assert from 'node:assert/strict';
import {reserveSelection} from '../utils/reserveSelection.ts';
test('empty reserve never contains synthetic payment targets',()=>{
 assert.deepEqual(reserveSelection([],new Set(['old'])),{ids:[],total:0});
});
test('only currently unpaid real bills are selected and amounts use kopecks',()=>{
 const bills=[{expense:{id:'a',amount:100},amountNeeded:50.1,isPaid:false},{expense:{id:'b',amount:80},amountNeeded:80,isPaid:true},{expense:{id:'c',amount:10.25},amountNeeded:10.25,isPaid:false}];
 assert.deepEqual(reserveSelection(bills,new Set(['a','b','c','missing'])),{ids:['a','c'],total:60.35});
});
