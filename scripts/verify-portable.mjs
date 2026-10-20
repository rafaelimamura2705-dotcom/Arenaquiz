import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';

const browser = await chromium.launch({headless:true,...(process.env.ARENA_CHROMIUM_PATH ? {executablePath:process.env.ARENA_CHROMIUM_PATH} : {})});
try {
 const context=await browser.newContext({offline:true,viewport:{width:1280,height:900}});
 const page=await context.newPage();
 // O Chromium gerenciado deste ambiente bloqueia file:// por política administrativa.
 // Entregue o mesmo HTML em memória, sem servidor ou recursos externos.
 const address='http://localhost/arena-quiz.html';
 const html=await readFile(resolve('downloads/Arena-Quiz.html'),'utf8');
 await page.route(address,route=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}));
 const errors=[]; const externalRequests=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{if(/^https?:/.test(request.url()) && request.url()!==address)externalRequests.push(request.url());});
 await page.goto(address);
 await page.getByRole('heading',{name:'Sua mente. Sua melhor arma.'}).waitFor();
 await page.getByRole('button',{name:'Meu perfil'}).click();
 await page.getByRole('button',{name:'Editar nome / Entrar'}).click();
 await page.getByLabel('Nome na arena').fill('Exploradora Offline');
 await page.getByLabel('E-mail fictício').fill('demo@example.com');
 await page.getByLabel('Senha fictícia').fill('apenas-demo');
 await page.getByRole('button',{name:'Começar minha jornada'}).click();
 await page.getByRole('button',{name:'Buscar duelo'}).click();
 await page.getByRole('button',{name:'Estou pronto',exact:true}).click();
 await page.locator('.question-card').waitFor();
 const seen=new Set();
 let complete=false;
 for(let round=0;round<3;round++){
  for(let question=0;question<3;question++){
   const prompt=await page.locator('.question-content h1').innerText();
   assert(!seen.has(prompt),'Uma pergunta foi repetida.');seen.add(prompt);
   await page.locator('.answer').first().click();
   await page.getByRole('button',{name:'Confirmar resposta'}).click();
   await page.locator('.answer-feedback').waitFor();
   await page.getByRole('button',{name:'Continuar',exact:true}).click();
  }
  await page.locator('.round-panel').waitFor();
  const final=page.getByRole('button',{name:'Ver resultado final'});
  if(await final.count()){await final.click();complete=true;break;}
  await page.getByRole('button',{name:/Ir para a .* partida/}).click();
 }
 assert(complete,'O duelo não encerrou em até três partidas.');
 await page.locator('.final-panel').waitFor();
 await page.getByRole('button',{name:'Ver meu histórico'}).click();
 await page.reload();
 assert.equal(await page.locator('.screen-history .result-list').first().locator('.result-row').count(),1);
 for(const screen of ['Categorias','Ranking','Início']) await page.getByRole('button',{name:screen,exact:true}).click();
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow horizontal no celular.');
 assert.deepEqual(errors,[],'Erros JavaScript na versão portátil.');
 assert.deepEqual(externalRequests,[],'A versão portátil solicitou recursos externos.');
 console.log(`PASSOU: HTML autônomo em Chromium offline, servido em memória; cadastro local, duelo com ${seen.size} perguntas sem repetição, resultado, histórico após recarregar, navegação e layout móvel. Zero requisições de rede e zero erros JavaScript.`);
 await context.close();
} finally { await browser.close(); }
