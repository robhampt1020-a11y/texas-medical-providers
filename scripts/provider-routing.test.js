const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname,'../netlify/functions/request-provider.js'),'utf8');
function setup(additions = {}, base = {}) {
  const sent = [];
  const context = {exports:{}, Buffer, process:{env:{
    PROVIDER_ROUTING_JSON_BASE64:Buffer.from(JSON.stringify(base)).toString('base64'),
    PROVIDER_ROUTING_ADDITIONS_JSON:typeof additions === 'string' ? additions : JSON.stringify(additions),
    RESEND_API_KEY:'test-only',FROM_EMAIL:'test@texasmedicalproviders.com',TMP_COPY_EMAIL:'info@texasmedicalproviders.com'
  }},fetch:async(url,options)=>{sent.push(JSON.parse(options.body));return {ok:true,json:async()=>({id:'test-only'})};}};
  vm.createContext(context); vm.runInContext(source,context);
  return {sent, handler:context.exports.handler};
}
const event = slug => ({httpMethod:'POST',body:JSON.stringify({providerSlug:slug,providerName:'Test Provider',firmName:'Test Firm',contactName:'Test Contact',email:'test@texasmedicalproviders.com',phone:'2105550100',cityOrZip:'Live Oak',caseType:'Other',acknowledgement:true})});
test('new provider routes through additions without changing existing destination',async()=>{
  const {handler,sent}=setup({'ps-clinics':{name:'PS Clinics',email:'ps-test@texasmedicalproviders.com'},existing:{email:'wrong-test@texasmedicalproviders.com'}},{existing:{name:'Existing',email:'existing-test@texasmedicalproviders.com'}});
  assert.equal((await handler(event('ps-clinics'))).statusCode,200);
  assert.equal(sent[0].to[0],'ps-test@texasmedicalproviders.com');
  assert.equal((await handler(event('existing'))).statusCode,200);
  assert.equal(sent[1].to[0],'existing-test@texasmedicalproviders.com');
});
test('unconfigured providers still fail without sending mail',async()=>{
  const {handler,sent}=setup();
  assert.equal((await handler(event('unknown'))).statusCode,400); assert.equal(sent.length,0);
});
test('invalid additions fail safely without sending mail',async()=>{
  const {handler,sent}=setup('[]');
  assert.equal((await handler(event('ps-clinics'))).statusCode,500); assert.equal(sent.length,0);
});
