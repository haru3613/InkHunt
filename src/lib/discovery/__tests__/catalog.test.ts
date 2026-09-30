import {describe,it,expect} from 'vitest'
import {parseExploreFilters,CITIES,diverseWorks} from '../catalog'
describe('public exploration filters',()=>{
 it('rejects raw filter syntax and invalid pagination',()=>{expect(parseExploreFilters({subject:'x),title.neq.null',city:'x',style:'a,b',page:'NaN'})).toEqual({subject:undefined,city:undefined,style:'',page:1})})
 it('accepts all Taiwan regions and known subjects',()=>{expect(CITIES).toHaveLength(22);const f=parseExploreFilters({subject:'botanical',city:'台北市',style:'fine-line',page:'2'});expect(f.subject?.words).toContain('花');expect(f.city).toBe('台北市');expect(f.page).toBe(2)})
 it('bounds abusive pages and rejects repeated values',()=>{expect(parseExploreFilters({page:'999999'}).page).toBe(10000);expect(parseExploreFilters({style:['fine-line','other'],page:'-1'})).toMatchObject({style:'',page:1})})
})

it("shows multiple creators before repeating a portfolio",()=>{const works=[{id:"a1",artists:{id:"a"}},{id:"a2",artists:{id:"a"}},{id:"b1",artists:{id:"b"}}];expect(diverseWorks(works,3).map(w=>w.id)).toEqual(["a1","b1","a2"]);expect(diverseWorks([],8)).toEqual([])})
