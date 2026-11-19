import test from 'node:test';
import assert from 'node:assert/strict';
import {replaceOrigin} from '../../scripts/rewrite-media-origins.js';
test('media migration rewrites only exact origins and recursively handles galleries',()=>{
 const value={logo:'http://localhost:8000/uploads/logo.jpg',gallery:[{url:'http://localhost:8000/uploads/a.jpg'}],price:100,other:'https://images.samsung.com/a.jpg',similar:'http://localhost:80000/uploads/no.jpg'};
 assert.deepEqual(replaceOrigin(value,'http://localhost:8000','https://api.example.com'),{...value,logo:'https://api.example.com/uploads/logo.jpg',gallery:[{url:'https://api.example.com/uploads/a.jpg'}]});assert.equal(value.logo,'http://localhost:8000/uploads/logo.jpg');
});
test('media migration keeps nulls and scalar values and is idempotent',()=>{
 assert.equal(replaceOrigin(null,'http://old','https://new'),null);assert.equal(replaceOrigin(1,'http://old','https://new'),1);assert.equal(replaceOrigin('https://new/uploads/a','http://old','https://new'),'https://new/uploads/a');
});
