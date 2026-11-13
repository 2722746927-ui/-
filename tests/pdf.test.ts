import { it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { createReportPDF } from '../src/lib/pdf';
import { report } from './fixtures';
it('generates a downloadable multi-page Chinese PDF with embedded font',async()=>{const r=report();r.actions[0].steps.push('这是较长的中文步骤，验证自动换行和跨页排版。'.repeat(80));const bytes=await createReportPDF(r,readFileSync('public/fonts/NotoSansSC.ttf'));expect(Buffer.from(bytes).subarray(0,5).toString()).toBe('%PDF-');const loaded=await PDFDocument.load(bytes);expect(loaded.getPageCount()).toBeGreaterThanOrEqual(7);expect(loaded.getTitle()).toBe(r.title);expect(bytes.length).toBeGreaterThan(10000);},60000);
it('exports the complete fictional sample with its explicit sample title',async()=>{const {EXAMPLE_REPORT}=await import('../src/lib/example');const bytes=await createReportPDF(EXAMPLE_REPORT,readFileSync('public/fonts/NotoSansSC.ttf'),true);const doc=await PDFDocument.load(bytes);expect(doc.getTitle()).toContain('示例');expect(doc.getPageCount()).toBeGreaterThanOrEqual(7);},60000);
