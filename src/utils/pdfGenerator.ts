import jsPDF from 'jspdf';
import { AssociationMember } from '../types';

export const generateSvadhisthanaAltaPdf = (member: AssociationMember): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 12;

  const primaryColor = [20, 20, 20];
  const textColor = [40, 40, 40];

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('ASOCIACIÓN CANNABICA SVADHISTHANA', pageWidth / 2, y, { align: 'center' });

  y += 5;
  doc.setFontSize(10);
  doc.text('SOLICITUD DE ALTA, DECLARACIÓN RESPONSABLE Y ACEPTACIÓN DE NORMAS', pageWidth / 2, y, { align: 'center' });

  y += 8;

  // 1. DATOS DE LA PERSONA SOLICITANTE
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('1. DATOS DE LA PERSONA SOLICITANTE', 14, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  const col1X = 14;
  const col2X = 110;

  doc.text(`Nombre y apellidos: ${member.firstName || ''} ${member.lastName || ''}`, col1X, y);
  doc.text(`N.º de socio/a: #${member.id ? member.id.slice(0, 8).toUpperCase() : 'N/D'}`, col2X, y);
  y += 4.5;

  doc.text(`DNI/NIE: ${member.dniPassport || ''}`, col1X, y);
  doc.text(`Fecha de nacimiento: ${member.birthDate || 'N/D'}`, col2X, y);
  y += 4.5;

  doc.text(`Domicilio: ${member.address || ''}`, col1X, y);
  doc.text(`Teléfono: ${member.phone || ''}`, col2X, y);
  y += 4.5;

  doc.text(`Correo electrónico: ${member.email || ''}`, col1X, y);
  y += 7;

  // 2. IDENTIFICACIÓN Y MAYORÍA DE EDAD
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('2. IDENTIFICACIÓN Y MAYORÍA DE EDAD', 14, y);
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const textSec2 = 'La persona solicitante exhibe su DNI/NIE original en vigor para comprobar su identidad y fecha de nacimiento. La Asociación dejará constancia de dicha comprobación en el apartado de uso interno, sin conservar copia del documento de identidad.';
  const splitSec2 = doc.splitTextToSize(textSec2, pageWidth - 28);
  doc.text(splitSec2, 14, y);
  y += (splitSec2.length * 3.5) + 4;

  // 3. DECLARACIÓN RESPONSABLE (TODAS LAS CASILLAS EN BLANCO [  ])
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('3. DECLARACIÓN RESPONSABLE DE LA PERSONA SOLICITANTE', 14, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const decls = [
    '[  ]  Ser consumidor/a de cannabis con anterioridad a la solicitud de ingreso.',
    '[  ]  Utilizar cannabis con finalidad terapéutica en relación con una enfermedad o sintomatología.',
    '[  ]  Declaro haber tenido a mi disposición los Estatutos y el Reglamento de Régimen Interno vigentes.',
    '[  ]  Declaro que mi solicitud de ingreso está avalada por una persona socia de la Asociación.',
    '[  ]  Declaro no haber sido condenado/a por delitos previstos en los artículos 368 y 369 del Código Penal.'
  ];

  decls.forEach(decl => {
    doc.text(decl, 14, y);
    y += 4.2;
  });

  y += 2;

  const numPoints = [
    '1. Es mayor de edad y los datos facilitados en esta solicitud son veraces.',
    '2. Conoce y acepta íntegramente los Estatutos y Reglamento de Régimen Interno.',
    '3. Conoce el carácter privado y de acceso restringido de la Asociación.',
    '4. Declara que el cannabis estará destinado exclusivamente a su consumo personal.',
    '5. Se compromete a no vender, ceder ni facilitar cannabis a terceras personas.',
    '6. Conoce y acepta que no podrá sacar cannabis fuera del espacio permitido.',
    '7. Asume la responsabilidad por sus actuaciones personales fuera de la Asociación.'
  ];

  numPoints.forEach(pt => {
    doc.text(pt, 16, y);
    y += 3.8;
  });

  y += 4;

  // 4. SOCIO/A AVALISTA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('4. SOCIO/A AVALISTA', 14, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Nombre y apellidos: __________________________________________________   N.º de socio/a: ___________', 14, y);
  y += 4.5;
  doc.text('Firma: ___________________________', 14, y);
  y += 7;

  // 5. CARÁCTER PRIVADO Y CONSUMO PERSONAL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('5. CARÁCTER PRIVADO Y CONSUMO PERSONAL', 14, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const textSec5 = 'La persona socia reconoce que su participación se desarrolla exclusivamente dentro del ámbito privado de la Asociación y conforme a sus fines, Estatutos y normas internas.';
  doc.text(textSec5, 14, y);
  y += 6;

  // 6. ESTATUTOS Y REGLAMENTO INTERNO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('6. ESTATUTOS Y REGLAMENTO INTERNO', 14, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const textSec6 = 'La persona solicitante declara haber tenido a su disposición los Estatutos y el Reglamento de Régimen Interno vigentes en la fecha de su admisión y aceptar las obligaciones derivadas.';
  const splitSec6 = doc.splitTextToSize(textSec6, pageWidth - 28);
  doc.text(splitSec6, 14, y);
  y += (splitSec6.length * 3.5) + 3;

  // 7. PROTECCIÓN DE DATOS PERSONALES
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('7. PROTECCIÓN DE DATOS PERSONALES', 14, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const textSec7 = 'Responsable: Asociación Cannábica Svadhisthana. Finalidad: gestionar la solicitud de admisión, la relación asociativa y el registro de socios. Derechos: acceso, rectificación, supresión, oposición, limitación dirigiéndose por escrito a la Asociación.';
  const splitSec7 = doc.splitTextToSize(textSec7, pageWidth - 28);
  doc.text(splitSec7, 14, y);
  y += (splitSec7.length * 3.5) + 4;

  // 8. ACEPTACIÓN Y FIRMA DE LA PERSONA SOCIA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('8. ACEPTACIÓN Y FIRMA DE LA PERSONA SOCIA', 14, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const dateStr = new Date(member.registerDate || Date.now()).toLocaleDateString('es-ES');
  doc.text('Lugar: San Cristóbal de La Laguna', 14, y);
  doc.text(`Fecha: ${dateStr}`, 110, y);
  y += 6;
  doc.text('Firma de la persona solicitante:', 14, y);
  y += 12;

  // 9. USO INTERNO DE LA ASOCIACIÓN
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('9. USO INTERNO DE LA ASOCIACIÓN', 14, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Identidad comprobada:  [  ] Sí   [  ] No          Mayoría de edad comprobada:  [  ] Sí   [  ] No', 14, y);
  y += 4.5;
  doc.text(`Fecha efectiva de admisión: ${dateStr}`, 14, y);
  y += 5;
  doc.text('Firma Junta Directiva / Sello:', 14, y);

  // Pie de página
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('Documento interno de admisión. Su contenido deberá aplicarse conjuntamente con los Estatutos, el Reglamento de Régimen Interno y la normativa vigente.', pageWidth / 2, 285, { align: 'center' });

  return doc;
};

export const exportBulkMembersPdf = (members: AssociationMember[]): void => {
  members.forEach((m) => {
    const doc = generateSvadhisthanaAltaPdf(m);
    doc.save(`Alta_Socio_${m.dniPassport}_Svadhisthana.pdf`);
  });
};