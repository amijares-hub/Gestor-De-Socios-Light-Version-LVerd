import jsPDF from 'jspdf';
import { AssociationMember } from '../types';

export function generateSvadhisthanaAltaPdf(member: AssociationMember & { dniFrontImage?: string; dniBackImage?: string; dni_front_image?: string; dni_back_image?: string }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Paleta B&W estricta
  const black = '#000000';
  const lightGray = '#E5E5E5';

  doc.setTextColor(black);
  doc.setDrawColor(black);

  // --- PÁGINA 1 ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('ASOCIACIÓN CANNABICA SVADHISTHANA', 105, 12, { align: 'center' });

  doc.setFontSize(8);
  doc.text('SOLICITUD DE ALTA, DECLARACIÓN RESPONSABLE Y ACEPTACIÓN DE NORMAS', 105, 17, { align: 'center' });

  // 1. DATOS DE LA PERSONA SOLICITANTE
  doc.setFillColor(lightGray);
  doc.rect(15, 21, 180, 5, 'F');
  doc.rect(15, 21, 180, 5, 'S');
  doc.setFontSize(8.5);
  doc.text('1. DATOS DE LA PERSONA SOLICITANTE', 18, 24.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  const fullName = `${member.firstName || ''} ${member.lastName || ''}`.toUpperCase();
  const docNum = (member.dniPassport || '').toUpperCase();
  const birthDate = member.birthDate || 'N/D';
  const address = (member.address || 'NO ESPECIFICADO').toUpperCase();
  const phone = member.phone || 'N/D';
  const email = member.email || 'N/D';
  const memberNum = (member.id || '').slice(0, 8).toUpperCase();
  const reqDate = new Date(member.registerDate || Date.now()).toLocaleDateString('es-ES');

  let y = 28;
  doc.rect(15, y, 180, 28);
  doc.line(15, y + 7, 195, y + 7);
  doc.line(15, y + 14, 195, y + 14);
  doc.line(15, y + 21, 195, y + 21);

  doc.text(`Nombre y apellidos: ${fullName}`, 18, y + 5);
  doc.text(`DNI/NIE: ${docNum}`, 18, y + 12);
  doc.text(`Fecha de nacimiento: ${birthDate}`, 110, y + 12);
  doc.text(`Domicilio: ${address}`, 18, y + 19);
  doc.text(`Teléfono: ${phone}`, 18, y + 26);
  doc.text(`Correo electrónico: ${email}`, 80, y + 26);
  doc.text(`N.º de socio/a: #${memberNum}`, 145, y + 26);

  // 2. IDENTIFICACIÓN Y MAYORÍA DE EDAD
  y = 58;
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(lightGray);
  doc.rect(15, y, 180, 5, 'F');
  doc.rect(15, y, 180, 5, 'S');
  doc.text('2. IDENTIFICACIÓN Y MAYORÍA DE EDAD', 18, y + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const text2 = 'La persona solicitante exhibe su DNI/NIE original en vigor para comprobar su identidad y fecha de nacimiento. La Asociación dejará constancia de dicha comprobación en el apartado de uso interno, sin conservar copia del documento de identidad.';
  doc.text(doc.splitTextToSize(text2, 176), 18, y + 8);

  // 3. DECLARACIÓN RESPONSABLE
  y = 73;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setFillColor(lightGray);
  doc.rect(15, y, 180, 5, 'F');
  doc.rect(15, y, 180, 5, 'S');
  doc.text('3. DECLARACIÓN RESPONSABLE DE LA PERSONA SOLICITANTE', 18, y + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const decLines = [
    '[X] Ser consumidor/a de cannabis con anterioridad a la solicitud de ingreso.',
    '[ ] Utilizar cannabis con finalidad terapéutica en relación con una enfermedad o sintomatología.',
    '[X] Declaro haber tenido a mi disposición los Estatutos y el Reglamento de Régimen Interno vigentes.',
    '[X] Declaro que mi solicitud de ingreso está avalada por una persona socia de la Asociación.',
    '[X] Declaro no haber sido condenado/a por delitos previstos en los artículos 368 y 369 del Código Penal.',
    '1. Es mayor de edad y los datos facilitados en esta solicitud son veraces.',
    '2. Conoce y acepta íntegramente los Estatutos y Reglamento de Régimen Interno.',
    '3. Conoce el carácter privado y de acceso restringido de la Asociación.',
    '4. Declara que el cannabis estará destinado exclusivamente a su consumo personal.',
    '5. Se compromete a no vender, ceder ni facilitar cannabis a terceras personas.',
    '6. Conoce y acepta que no podrá sacar cannabis fuera del espacio permitido.',
    '7. Asume la responsabilidad por sus actuaciones personales fuera de la Asociación.'
  ];
  let dy = y + 8;
  decLines.forEach(line => {
    doc.text(line, 18, dy);
    dy += 3.6;
  });

  // 4. SOCIO/A AVALISTA
  y = 124;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setFillColor(lightGray);
  doc.rect(15, y, 180, 5, 'F');
  doc.rect(15, y, 180, 5, 'S');
  doc.text('4. SOCIO/A AVALISTA', 18, y + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Nombre y apellidos: __________________________________________________', 18, y + 9);
  doc.text('N.º de socio/a: _______________   Firma: ___________________________________', 18, y + 14);

  // 5. CARÁCTER PRIVADO Y CONSUMO PERSONAL
  y = 143;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setFillColor(lightGray);
  doc.rect(15, y, 180, 5, 'F');
  doc.rect(15, y, 180, 5, 'S');
  doc.text('5. CARÁCTER PRIVADO Y CONSUMO PERSONAL', 18, y + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(doc.splitTextToSize('La persona socia reconoce que su participación se desarrolla exclusivamente dentro del ámbito privado de la Asociación y conforme a sus fines, Estatutos y normas internas.', 176), 18, y + 8);

  // 6. ESTATUTOS Y REGLAMENTO INTERNO
  y = 157;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setFillColor(lightGray);
  doc.rect(15, y, 180, 5, 'F');
  doc.rect(15, y, 180, 5, 'S');
  doc.text('6. ESTATUTOS Y REGLAMENTO INTERNO', 18, y + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(doc.splitTextToSize('La persona solicitante declara haber tenido a su disposición los Estatutos y el Reglamento de Régimen Interno vigentes en la fecha de su admisión y aceptar las obligaciones derivadas.', 176), 18, y + 8);

  // 7. PROTECCIÓN DE DATOS PERSONALES
  y = 171;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setFillColor(lightGray);
  doc.rect(15, y, 180, 5, 'F');
  doc.rect(15, y, 180, 5, 'S');
  doc.text('7. PROTECCIÓN DE DATOS PERSONALES', 18, y + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  const lopdText = 'Responsable: Asociación Cannábica Svadhisthana. Finalidad: gestionar la solicitud de admisión, la relación asociativa y el registro de socios. Derechos: acceso, rectificación, supresión, oposición, limitación dirigiéndose por escrito a la Asociación.';
  doc.text(doc.splitTextToSize(lopdText, 176), 18, y + 7.5);

  // 8. ACEPTACIÓN Y FIRMA DE LA PERSONA SOCIA
  y = 186;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setFillColor(lightGray);
  doc.rect(15, y, 180, 5, 'F');
  doc.rect(15, y, 180, 5, 'S');
  doc.text('8. ACEPTACIÓN Y FIRMA DE LA PERSONA SOCIA', 18, y + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Lugar: San Cristóbal de La Laguna       Fecha: ${reqDate}`, 18, y + 9);
  doc.text('Firma de la persona solicitante:', 18, y + 15);
  doc.rect(18, y + 17, 75, 18);

  // 9. USO INTERNO DE LA ASOCIACIÓN (Posicionamiento Corregido Sin Solapamiento)
  y = 227;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setFillColor(lightGray);
  doc.rect(15, y, 180, 5, 'F');
  doc.rect(15, y, 180, 5, 'S');
  doc.text('9. USO INTERNO DE LA ASOCIACIÓN', 18, y + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  // Columna Izquierda (x=18)
  doc.text('Identidad comprobada: [X] Sí   [ ] No', 18, y + 10);
  doc.text('Mayoría de edad comprobada: [X] Sí   [ ] No', 18, y + 16);
  doc.text(`Fecha efectiva de admisión: ${reqDate}`, 18, y + 22);

  // Columna Derecha (x=115) - Firma Junta / Sello
  doc.text('Firma Junta Directiva / Sello:', 115, y + 10);
  doc.rect(115, y + 12, 65, 18);

  // Pie de página
  doc.setFontSize(6);
  doc.setTextColor(80, 80, 80);
  doc.text('Documento interno de admisión. Su contenido deberá aplicarse conjuntamente con los Estatutos, el Reglamento de Régimen Interno y la normativa vigente.', 105, 268, { align: 'center' });

  // --- PÁGINA 2: ANEXO FOTOGRÁFICO DNI (B&W) ---
  const frontImg = member.dniFrontImage || member.dni_front_image;
  const backImg = member.dniBackImage || member.dni_back_image;

  if (frontImg || backImg) {
    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(black);
    doc.text('ASOCIACIÓN CANNABICA SVADHISTHANA', 105, 15, { align: 'center' });
    doc.setFontSize(8.5);
    doc.text(`ANEXO: DOCUMENTACIÓN DIGITALIZADA - SOCIO #${memberNum}`, 105, 21, { align: 'center' });
    doc.line(15, 24, 195, 24);

    let py = 30;
    if (frontImg) {
      try {
        doc.addImage(frontImg, 'JPEG', 30, py, 150, 95);
        doc.setFontSize(8);
        doc.text('PARTE DELANTERA (ANVERSO)', 105, py + 101, { align: 'center' });
        py += 110;
      } catch (e) {
        console.error("Error adjuntando foto delantera:", e);
      }
    }

    if (backImg) {
      try {
        doc.addImage(backImg, 'JPEG', 30, py, 150, 95);
        doc.setFontSize(8);
        doc.text('PARTE TRASERA (REVERSO)', 105, py + 101, { align: 'center' });
      } catch (e) {
        console.error("Error adjuntando foto trasera:", e);
      }
    }
  }

  return doc;
}

export function exportBulkMembersPdf(selectedMembers: AssociationMember[]) {
  selectedMembers.forEach((member, index) => {
    setTimeout(() => {
      const doc = generateSvadhisthanaAltaPdf(member);
      doc.save(`Alta_Socio_${member.dniPassport}_Svadhisthana.pdf`);
    }, index * 250);
  });
}