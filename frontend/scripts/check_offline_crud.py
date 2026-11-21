"""Native Chromium/IndexedDB regressions. Start Vite first; requires Selenium.

python scripts/check_offline_crud.py --url http://127.0.0.1:5184 --driver <chromedriver.exe>
Uses a disposable Chrome profile, no application backend or development data.
"""
import argparse
import json
from selenium import webdriver
from selenium.webdriver.chrome.service import Service

parser = argparse.ArgumentParser()
parser.add_argument("--url", default="http://127.0.0.1:5184")
parser.add_argument("--driver", required=True)
args = parser.parse_args()
options = webdriver.ChromeOptions()
options.add_argument("--headless=new")
options.add_argument("--disable-gpu")
service = Service(args.driver, service_args=["--disable-build-check"])
service.creation_flags = 0x08000000
browser = webdriver.Chrome(service=service, options=options)
browser.set_script_timeout(30)

boot = """
const done = arguments[arguments.length-1];
(async () => {
  localStorage.setItem('greenspot_user', JSON.stringify({user_id:'browser-test-user'}));
  window.r = await import('/src/features/offline/services/outboxQueueRepository.ts');
  window.d = await import('/src/features/offline/services/draftRepository.ts');
  window.dbModule = await import('/src/features/offline/services/offlineDb.ts');
  window.payload = () => ({client_submission_id:crypto.randomUUID(), idempotency_key:crypto.randomUUID(),
    user_id:'browser-test-user', title:'Rác', category_id:1, category_name:'Rác', description:'Cần thu gom',
    severity:'MEDIUM', latitude:10.77, longitude:106.7, address_text:'Quận 1', is_anonymous:false, media_blobs:[]});
  done(true);
})().catch(e => done({error:String(e)}));
"""

checks = """
const done = arguments[arguments.length-1];
(async () => {
  const results = [];
  const expect = (value, name) => { if (!value) throw new Error(name); results.push(name); };
  const one = await r.enqueueReport(payload());
  const deletes = await Promise.allSettled([r.deleteQueueItem(one.queue_id), r.deleteQueueItem(one.queue_id)]);
  expect(deletes.filter(x => x.status==='fulfilled').length===1, 'concurrent delete: exactly one success');
  const two = await r.enqueueReport(payload());
  const replacements = await Promise.allSettled([
    r.replaceQueueItem(two.queue_id,payload(),two.updated_at),
    r.replaceQueueItem(two.queue_id,payload(),two.updated_at)]);
  expect(replacements.filter(x=>x.status==='fulfilled').length===1, 'stale edit cannot recreate deleted queue item');
  const three = await r.enqueueReport(payload());
  const claims = await Promise.allSettled([
    r.updateQueueItemStatus(three.queue_id,{status:'SENDING'},three.updated_at),
    r.updateQueueItemStatus(three.queue_id,{status:'SENDING'},three.updated_at)]);
  expect(claims.filter(x=>x.status==='fulfilled').length===1, 'only one sync run can claim item');
  const edits = await Promise.allSettled([r.replaceQueueItem(three.queue_id,payload()),r.deleteQueueItem(three.queue_id)]);
  expect(edits.every(x=>x.status==='rejected'), 'sending item cannot be edited or deleted');
  const draft = {draft_id:crypto.randomUUID(),user_id:'browser-test-user',title:'Draft',formData:{},media_blobs:[],saved_at:new Date().toISOString(),current_step:1,updated_at:1};
  await d.saveDraftToDb(draft);
  localStorage.setItem('greenspot_user',JSON.stringify({user_id:'other-user'}));
  const access = await Promise.allSettled([d.saveDraftToDb({...draft,user_id:'other-user'}),d.deleteDraftFromDb(draft.draft_id),r.deleteQueueItem(three.queue_id,true)]);
  expect(access.every(x=>x.status==='rejected'), 'other account cannot overwrite or delete saved records');
  localStorage.setItem('greenspot_user',JSON.stringify({user_id:'browser-test-user'}));
  const db = await dbModule.openOfflineDatabase();
  const original = db.transaction.bind(db);
  db.transaction = (...args) => {
    const tx = original(...args); const objectStore = tx.objectStore.bind(tx);
    tx.objectStore = name => {
      const store = objectStore(name); const put = store.put.bind(store);
      store.put = (...data) => {const request=put(...data); request.addEventListener('success',()=>tx.abort()); return request;};
      return store;
    };
    return tx;
  };
  const abortedDraft = {...draft,draft_id:crypto.randomUUID()};
  const aborted = await Promise.allSettled([d.saveDraftToDb(abortedDraft)]);
  db.transaction = original;
  expect(aborted[0].status==='rejected' && await d.getDraftById(abortedDraft.draft_id)===null, 'transaction abort after request success is reported and rolled back');
  const crossTab = await r.enqueueReport(payload());
  done({results,crossTabId:crossTab.queue_id});
})().catch(e=>done({error:String(e),stack:e.stack}));
"""

try:
    browser.get(args.url + "/src/vite-env.d.ts")
    assert browser.execute_async_script(boot) is True
    result = browser.execute_async_script(checks)
    assert "error" not in result, result
    first = browser.current_window_handle
    browser.switch_to.new_window("tab")
    browser.get(args.url + "/src/vite-env.d.ts")
    assert browser.execute_async_script(boot) is True
    browser.switch_to.window(first)
    deleted = browser.execute_async_script("const done=arguments[arguments.length-1];r.deleteQueueItem(arguments[0]).then(()=>done(true)).catch(e=>done(String(e)))", result["crossTabId"])
    assert deleted is True, deleted
    browser.switch_to.window(browser.window_handles[1])
    second = browser.execute_async_script("const done=arguments[arguments.length-1];r.deleteQueueItem(arguments[0]).then(()=>done(false)).catch(e=>done(e.message))", result["crossTabId"])
    assert isinstance(second, str) and "không còn tồn tại" in second, second
    result["results"].append("two browser tabs: second delete reports missing")
    print(json.dumps(result["results"], ensure_ascii=False, indent=2))
finally:
    browser.quit()
