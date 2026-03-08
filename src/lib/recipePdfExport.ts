/**
 * Export a single recipe as a branded NutriZen PDF
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TEAL = { r: 13, g: 115, b: 119 };
const DARK = { r: 26, g: 46, b: 53 };
const GRAY = { r: 100, g: 116, b: 139 };
const WHITE = { r: 255, g: 255, b: 255 };
const PAGE_W = 210;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;

interface RecipePdfData {
  title: string;
  difficulty_level?: string;
  cuisine_type?: string;
  meal_type?: string;
  diet_type?: string;
  prep_time_min?: number;
  total_time_min?: number;
  servings?: number;
  calories_kcal?: number;
  proteins_g?: number;
  carbs_g?: number;
  fats_g?: number;
  ingredients: any[];
  instructions: any[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function exportRecipePdf(recipe: RecipePdfData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ── Header bar ──
  doc.setFillColor(TEAL.r, TEAL.g, TEAL.b);
  doc.rect(0, 0, PAGE_W, 28, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(WHITE.r, WHITE.g, WHITE.b);
  doc.text('NutriZen', MARGIN, 12);
  doc.setFontSize(10);
  doc.text('mynutrizen.fr', PAGE_W - MARGIN, 12, { align: 'right' });

  // Title
  doc.setFontSize(14);
  doc.text(recipe.title, MARGIN, 23);

  let y = 34;

  // ── Tags ──
  const tags = [
    recipe.difficulty_level === 'beginner' ? 'Débutant' :
      recipe.difficulty_level === 'intermediate' ? 'Intermédiaire' :
        recipe.difficulty_level === 'expert' ? 'Expert' : null,
    recipe.cuisine_type,
    recipe.meal_type,
    recipe.diet_type,
  ].filter(Boolean);

  if (tags.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(TEAL.r, TEAL.g, TEAL.b);
    doc.text(tags.join('  •  '), MARGIN, y);
    y += 7;
  }

  // ── Info grid ──
  const infoItems = [
    recipe.prep_time_min ? `Préparation : ${recipe.prep_time_min} min` : null,
    recipe.total_time_min ? `Total : ${recipe.total_time_min} min` : null,
    recipe.servings ? `Portions : ${recipe.servings}` : null,
    recipe.calories_kcal ? `Calories : ${recipe.calories_kcal} kcal` : null,
  ].filter(Boolean);

  if (infoItems.length > 0) {
    doc.setFillColor(240, 248, 248);
    doc.roundedRect(MARGIN, y, CONTENT_W, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(DARK.r, DARK.g, DARK.b);
    doc.text(infoItems.join('   |   '), MARGIN + 4, y + 7);
    y += 16;
  }

  // ── Nutritional values table ──
  if (recipe.calories_kcal || recipe.proteins_g || recipe.carbs_g || recipe.fats_g) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(TEAL.r, TEAL.g, TEAL.b);
    doc.text('Valeurs nutritionnelles (par portion)', MARGIN, y + 4);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Nutriment', 'Quantité']],
      body: [
        ['Calories', `${recipe.calories_kcal ?? '—'} kcal`],
        ['Protéines', `${recipe.proteins_g ?? '—'} g`],
        ['Glucides', `${recipe.carbs_g ?? '—'} g`],
        ['Lipides', `${recipe.fats_g ?? '—'} g`],
      ],
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 9, cellPadding: 3, textColor: [DARK.r, DARK.g, DARK.b] },
      headStyles: { fillColor: [TEAL.r, TEAL.g, TEAL.b], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 250, 250] },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 40 } },
      tableWidth: 100,
    });
    y = (doc as any).lastAutoTable?.finalY + 8 ?? y + 40;
  }

  // ── Ingrédients ──
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  if (ingredients.length > 0) {
    if (y > 240) { doc.addPage(); y = MARGIN; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(TEAL.r, TEAL.g, TEAL.b);
    doc.text('Ingrédients', MARGIN, y + 4);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(DARK.r, DARK.g, DARK.b);
    for (const ing of ingredients) {
      if (y > 275) { doc.addPage(); y = MARGIN; }
      const text = typeof ing === 'string' ? ing :
        `${ing.quantity ?? ''}${ing.unit ? ' ' + ing.unit : ''} ${ing.name || ing.ingredient || ''}`.trim();
      doc.text(`•  ${text}`, MARGIN + 2, y);
      y += 5;
    }
    y += 4;
  }

  // ── Instructions ──
  const instructions = Array.isArray(recipe.instructions) ? recipe.instructions : [];
  if (instructions.length > 0) {
    if (y > 230) { doc.addPage(); y = MARGIN; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(TEAL.r, TEAL.g, TEAL.b);
    doc.text('Instructions', MARGIN, y + 4);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(DARK.r, DARK.g, DARK.b);
    instructions.forEach((inst: any, i: number) => {
      if (y > 270) { doc.addPage(); y = MARGIN; }
      const text = typeof inst === 'string' ? inst : inst.step || inst.instruction || '';
      const lines = doc.splitTextToSize(`${i + 1}. ${text}`, CONTENT_W - 4);
      doc.text(lines, MARGIN + 2, y);
      y += lines.length * 4.5 + 2;
    });
  }

  // ── Footer on all pages ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(GRAY.r, GRAY.g, GRAY.b);
    doc.text('Généré par NutriZen — mynutrizen.fr', PAGE_W / 2, 290, { align: 'center' });
  }

  doc.save(`nutrizen-${slugify(recipe.title)}.pdf`);
}
