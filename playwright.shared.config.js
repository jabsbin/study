import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';
export default defineConfig({...base,testIgnore:[],testMatch:'**/together.spec.js',timeout:420000,use:{...base.use,baseURL:'http://127.0.0.1:8787',launchOptions:{...base.use.launchOptions,args:[...base.use.launchOptions.args,'--disable-background-timer-throttling','--disable-renderer-backgrounding']}},webServer:{command:'npm run dev:shared',url:'http://127.0.0.1:8787/api/health',reuseExistingServer:!process.env.CI,timeout:120000}});
