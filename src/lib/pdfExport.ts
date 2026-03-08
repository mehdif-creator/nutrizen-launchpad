/**
 * PDF Export utility for NutriZen
 * Generates beautiful PDFs for menus, recipes, and shopping lists.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DayRecipes, RecipeInfo } from '@/hooks/useWeeklyRecipesByDay';
import type { MergedShoppingItem } from '@/lib/shoppingListUtils';
import { CATEGORY_ORDER, CATEGORY_ICONS } from '@/lib/shoppingListUtils';

// ─── Theme constants ───────────────────────────────────────────────
const BRAND = { r: 22, g: 163, b: 74 }; // primary green
const BRAND_LIGHT = { r: 220, g: 252, b: 231 };
const GRAY = { r: 100, g: 116, b: 139 };
const DARK = { r: 30, g: 41, b: 59 };
const WHITE = { r: 255, g: 255, b: 255 };
const PAGE_W = 210; // A4 mm
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ─── Helpers ────────────────────────────────────────────────────────

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  const y = MARGIN;
  // Green bar
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, PAGE_W, 28, 'F');

  // Logo text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(WHITE.r, WHITE.g, WHITE.b);
  doc.text('NutriZen', MARGIN, y + 8);

  // Title
  doc.setFontSize(12);
  doc.text(title, MARGIN, y + 18);

  // Subtitle
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(BRAND_LIGHT.r, BRAND_LIGHT.g, BRAND_LIGHT.b);
    doc.text(subtitle, PAGE_W - MARGIN, y + 18, { align: 'right' });
  }

  return 34; // next Y position
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(GRAY.r, GRAY.g, GRAY.b);
    doc.text(
      `NutriZen — Page ${i}/${pageCount}`,
      PAGE_W / 2,
      297 - 8,
      { align: 'center' }
    );
  }
}

function addSectionTitle(doc: jsPDF, y: number, title: string, emoji?: string): number {
  if (y > 260) {
    doc.addPage();
    y = MARGIN + 5;
  }
  doc.setFillColor(BRAND_LIGHT.r, BRAND_LIGHT.g, BRAND_LIGHT.b);
  doc.roundedRect(MARGIN, y, CONTENT_W, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text(`${emoji ? emoji + ' ' : ''}${title}`, MARGIN + 4, y + 7);
  return y + 14;
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  return `Semaine du ${fmt(start)} au ${fmt(end)} ${start.getFullYear()}`;
}

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// ─── MENU TABLE ─────────────────────────────────────────────────────

function addMenuTable(doc: jsPDF, startY: number, days: DayRecipes[]): number {
  const tableData = days.map((day) => {
    const lunch = day.lunch;
    const dinner = day.dinner;
    return [
      day.day_name || DAY_NAMES[day.day_index] || '—',
      lunch ? `${lunch.title}\n${lunch.calories} kcal` : '—',
      dinner ? `${dinner.title}\n${dinner.calories} kcal` : '—',
      `${(lunch?.calories || 0) + (dinner?.calories || 0)} kcal`,
    ];
  });

  autoTable(doc, {
    startY,
    head: [['Jour', 'Déjeuner', 'Dîner', 'Total']],
    body: tableData,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: [DARK.r, DARK.g, DARK.b],
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [BRAND.r, BRAND.g, BRAND.b],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: 'bold' },
      1: { cellWidth: 60 },
      2: { cellWidth: 60 },
      3: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
    },
  });

  return (doc as any).lastAutoTable?.finalY ?? startY + 80;
}

// ─── RECIPE CARDS ───────────────────────────────────────────────────

function addRecipeBlock(doc: jsPDF, y: number, recipe: RecipeInfo, dayName: string, mealType: string): number {
  if (y > 230) {
    doc.addPage();
    y = MARGIN + 5;
  }

  // Recipe title bar
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(MARGIN, y, CONTENT_W, 8, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(DARK.r, DARK.g, DARK.b);
  doc.text(`${dayName} — ${mealType}`, MARGIN + 3, y + 5.5);
  y += 11;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text(recipe.title, MARGIN + 3, y + 4);
  y += 8;

  // Macros badge
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(GRAY.r, GRAY.g, GRAY.b);
  const macrosText = `${recipe.calories} kcal  |  P: ${recipe.proteins_g}g  |  G: ${recipe.carbs_g}g  |  L: ${recipe.fats_g}g  |  Prépa: ${recipe.prep_min} min  |  Total: ${recipe.total_min} min`;
  doc.text(macrosText, MARGIN + 3, y + 3);
  y += 8;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 4;

  return y;
}

// ─── SHOPPING LIST TABLE ────────────────────────────────────────────

function addShoppingListTable(doc: jsPDF, startY: number, items: MergedShoppingItem[]): number {
  // Group by category
  const grouped = new Map<string, MergedShoppingItem[]>();
  for (const item of items) {
    const cat = item.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }

  // Build table data with category headers
  const tableData: (string[])[] = [];
  for (const cat of CATEGORY_ORDER) {
    const catItems = grouped.get(cat);
    if (!catItems || catItems.length === 0) continue;
    const icon = CATEGORY_ICONS[cat] || '📦';
    tableData.push([`${icon} ${cat}`, '', '']);
    for (const item of catItems) {
      tableData.push(['', item.displayName, item.displayQty]);
    }
  }

  autoTable(doc, {
    startY,
    head: [['Catégorie', 'Article', 'Quantité']],
    body: tableData,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: [DARK.r, DARK.g, DARK.b],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [BRAND.r, BRAND.g, BRAND.b],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 80 },
      2: { cellWidth: 40, halign: 'right' },
    },
    didParseCell: (data: any) => {
      // Bold category rows
      if (data.section === 'body' && data.row.raw[0] && data.column.index === 0) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [BRAND_LIGHT.r, BRAND_LIGHT.g, BRAND_LIGHT.b];
        data.cell.styles.textColor = [BRAND.r, BRAND.g, BRAND.b];
      }
    },
  });

  return (doc as any).lastAutoTable?.finalY ?? startY + 60;
}

// ─── PUBLIC EXPORTS ─────────────────────────────────────────────────

/**
 * Export the full weekly pack as PDF:
 * 1. Menu overview table
 * 2. Recipe details per day
 * 3. Shopping list
 */
export function exportWeeklyPackPdf(
  weekStart: string,
  days: DayRecipes[],
  shoppingItems: MergedShoppingItem[],
  householdLabel?: string
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const weekLabel = formatWeekRange(weekStart);

  // ── PAGE 1: Menu Overview ──
  let y = addHeader(doc, 'Pack Semaine Zen', weekLabel);
  y += 2;

  if (householdLabel) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(GRAY.r, GRAY.g, GRAY.b);
    doc.text(`Foyer : ${householdLabel}`, MARGIN, y + 3);
    y += 8;
  }

  y = addSectionTitle(doc, y, 'Menu de la semaine', '📅');
  y = addMenuTable(doc, y, days);
  y += 6;

  // Weekly summary
  const totalCal = days.reduce((sum, d) => sum + (d.lunch?.calories || 0) + (d.dinner?.calories || 0), 0);
  const avgCal = days.length > 0 ? Math.round(totalCal / days.length) : 0;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(GRAY.r, GRAY.g, GRAY.b);
  doc.text(`Moyenne journalière : ${avgCal} kcal  |  Total semaine : ${totalCal} kcal`, MARGIN, y + 3);
  y += 10;

  // ── PAGE 2+: Recipes ──
  doc.addPage();
  y = addHeader(doc, 'Recettes de la semaine', weekLabel);
  y += 2;

  for (const day of days) {
    const dayName = day.day_name || DAY_NAMES[day.day_index] || '—';
    if (day.lunch) {
      y = addRecipeBlock(doc, y, day.lunch, dayName, 'Déjeuner');
    }
    if (day.dinner) {
      y = addRecipeBlock(doc, y, day.dinner, dayName, 'Dîner');
    }
  }

  // ── SHOPPING LIST ──
  if (shoppingItems.length > 0) {
    doc.addPage();
    y = addHeader(doc, 'Liste de courses', weekLabel);
    y += 2;
    y = addSectionTitle(doc, y, 'Courses de la semaine', '🛒');
    addShoppingListTable(doc, y, shoppingItems);
  }

  addFooter(doc);

  const fileName = `nutrizen-pack-${weekStart}.pdf`;
  doc.save(fileName);
}

/**
 * Export only the shopping list as PDF
 */
export function exportShoppingListPdf(
  weekStart: string,
  items: MergedShoppingItem[],
  householdLabel?: string
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const weekLabel = formatWeekRange(weekStart);

  let y = addHeader(doc, 'Liste de courses', weekLabel);
  y += 2;

  if (householdLabel) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(GRAY.r, GRAY.g, GRAY.b);
    doc.text(`Foyer : ${householdLabel}`, MARGIN, y + 3);
    y += 8;
  }

  y = addSectionTitle(doc, y, `${items.length} articles`, '🛒');
  addShoppingListTable(doc, y, items);

  addFooter(doc);

  doc.save(`nutrizen-courses-${weekStart}.pdf`);
}
