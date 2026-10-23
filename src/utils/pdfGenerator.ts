import jsPDF from 'jspdf';
import { AssociationMember } from '../types';

export function generateSvadhisthanaAltaPdf(
  member: AssociationMember & {
    dniFrontImage?: string;
    dniBackImage?: string;
    dni_front_image?: string;
    dni_back_image?: string;
  }
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Paleta B&W estricta
  const black = '#000000';
  const lightGray = '#E5E5E5';

  doc.setTextColor(black);
  doc.setDrawColor(black);

  // --- CABECERA PRINCIPAL ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('ASOCIACIÓN CANNABICA SVADHISTHANA', 105, 10.5, { align: 'center' });

  doc.setFontSize(11);
  doc.text('SOLICITUD DE ALTA, DECLARACIÓN RESPONSABLE Y ACEPTACIÓN DE NORMAS', 105, 16.5, { align: 'center' });

  // --- 1. DATOS DE LA PERSONA SOLICITANTE ---
  doc.setFillColor(lightGray);
  doc.rect(15, 20, 180, 6, 'F');
  doc.rect(15, 20, 180, 6, 'S');
  doc.setFontSize(11);
  doc.text('1. DATOS DE LA PERSONA SOLICITANTE', 18, 24.3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const fullName = `${member.firstName || ''} ${member.lastName || ''}`.toUpperCase();
  const docNum = (member.dniPassport || '').toUpperCase();
  const birthDate = member.birthDate || 'N/D';
  const address = (member.address || 'NO ESPECIFICADO').toUpperCase();
  const phone = member.phone || 'N/D';
  const email = member.email || 'N/D';
  const memberNum = (member as any).memberNumber || `SOC-${(member.id || '').slice(0, 6).toUpperCase()}`;
  const reqDate = new Date(member.registerDate || Date.now()).toLocaleDateString('es-ES');

  let y = 26;
  doc.rect(15, y, 180, 28);
  doc.line(15, y + 7, 195, y + 7);
  doc.line(15, y + 14, 195, y + 14);
  doc.line(15, y + 21, 195, y + 21);

  doc.text(`Nombre y apellidos: ${fullName}`, 18, y + 5.2);
  doc.text(`DNI/NIE/Pasaporte: ${docNum}`, 18, y + 12.2);
  doc.text(`Fecha de nacimiento: ${birthDate}`, 110, y + 12.2);
  doc.text(`Domicilio: ${address}`, 18, y + 19.2);
  doc.text(`Teléfono: ${phone}`, 18, y + 26.2);
  doc.text(`Correo electrónico: ${email}`, 76, y + 26.2);
  doc.text(`N.º de socio/a: ${memberNum}`, 143, y + 26.2);

  // --- 2. IDENTIFICACIÓN Y MAYORÍA DE EDAD ---
  y = 56;
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(lightGray);
  doc.rect(15, y, 180, 5.5, 'F');
  doc.rect(15, y, 180, 5.5, 'S');
  doc.setFontSize(11);
  doc.text('2. IDENTIFICACIÓN Y MAYORÍA DE EDAD', 18, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const text2 = 'La persona solicitante exhibe su DNI/NIE original en vigor para comprobar su identidad y fecha de nacimiento. La Asociación dejará constancia de dicha comprobación en el apartado de uso interno.';
  doc.text(doc.splitTextToSize(text2, 176), 18, y + 9.5);

  // --- 3. DECLARACIÓN RESPONSABLE ---
  y = 73.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setFillColor(lightGray);
  doc.rect(15, y, 180, 5.5, 'F');
  doc.rect(15, y, 180, 5.5, 'S');
  doc.text('3. DECLARACIÓN RESPONSABLE DE LA PERSONA SOLICITANTE', 18, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.6);
  const decLines = [
    '[ ] Ser consumidor/a de cannabis con anterioridad a la solicitud de ingreso.',
    '[ ] Declaro haber tenido a mi disposición los Estatutos y el Reglamento de Régimen Interno vigentes.',
    '[ ] Declaro que mi solicitud de ingreso está avalada por una persona socia de la Asociación.',
    '[ ] Declaro que mi solicitud de ingreso responde exclusivamente a fines de consumo personal y me comprometo a no vender, ceder ni facilitar cannabis a terceras personas, así como a respetar los Estatutos y el Reglamento de Régimen Interno de la Asociación.',
    '1. Es mayor de edad y los datos facilitados en esta solicitud son veraces.',
    '2. Conoce y acepta íntegramente los Estatutos y Reglamento de Régimen Interno.',
    '3. Conoce el carácter privado y de acceso restringido de la Asociación.',
    '4. Declara que el cannabis estará destinado exclusivamente a su consumo personal.',
    '5. Se compromete a no vender, ceder ni facilitar cannabis a terceras personas.',
    '6. Conoce y acepta que no podrá sacar cannabis fuera del espacio permitido.',
    '7. Asume la responsabilidad por sus actuaciones personales fuera de la Asociación.'
  ];

  let dy = y + 9.2;
  decLines.forEach(line => {
    const splitLines = doc.splitTextToSize(line, 176);
    doc.text(splitLines, 18, dy);
    dy += splitLines.length * 3.55;
  });

  // --- 4. SOCIO/A AVALISTA ---
  y = 129;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setFillColor(lightGray);
  doc.rect(15, y, 180, 5.5, 'F');
  doc.rect(15, y, 180, 5.5, 'S');
  doc.text('4. SOCIO/A AVALISTA', 18, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Nombre y apellidos: __________________________________________________', 18, y + 10.2);
  doc.text('N.º de socio/a: _______________   Firma: ___________________________________', 18, y + 16);

  // --- 5. CARÁCTER PRIVADO Y CONSUMO PERSONAL ---
  y = 149;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setFillColor(lightGray);
  doc.rect(15, y, 180, 5.5, 'F');
  doc.rect(15, y, 180, 5.5, 'S');
  doc.text('5. CARÁCTER PRIVADO Y CONSUMO PERSONAL', 18, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    doc.splitTextToSize('La persona socia reconoce que su participación se desarrolla exclusivamente dentro del ámbito privado de la Asociación y conforme a sus fines, Estatutos y normas internas.', 176),
    18,
    y + 9.5
  );

  // --- 6. ESTATUTOS Y REGLAMENTO INTERNO ---
  y = 165.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setFillColor(lightGray);
  doc.rect(15, y, 180, 5.5, 'F');
  doc.rect(15, y, 180, 5.5, 'S');
  doc.text('6. ESTATUTOS Y REGLAMENTO INTERNO', 18, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    doc.splitTextToSize('La persona solicitante declara haber tenido a su disposición los Estatutos y el Reglamento de Régimen Interno vigentes en la fecha de su admisión y aceptar las obligaciones derivadas.', 176),
    18,
    y + 9.5
  );

  // --- 7. PROTECCIÓN DE DATOS PERSONALES ---
  y = 182;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setFillColor(lightGray);
  doc.rect(15, y, 180, 5.5, 'F');
  doc.rect(15, y, 180, 5.5, 'S');
  doc.text('7. PROTECCIÓN DE DATOS PERSONALES', 18, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  const lopdText = 'Responsable: Asociación Cannábica Svadhisthana. Finalidad: gestionar la solicitud de admisión, la relación asociativa y el registro de socios/as, así como el cumplimiento de las obligaciones legales y estatutarias de la Asociación. Base jurídica: la gestión de la relación asociativa y el cumplimiento de las obligaciones legales aplicables. Destinatarios: los datos no serán comunicados a terceros, salvo obligación legal o requerimiento de autoridad competente. Conservación: los datos se conservarán mientras permanezca vigente la relación asociativa y, posteriormente, durante los plazos necesarios para atender las obligaciones y posibles responsabilidades legales. Derechos: la persona interesada podrá ejercer sus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y, cuando proceda, portabilidad, mediante solicitud dirigida a Svadhisthana.aso.can@gmail.com.';
  doc.text(doc.splitTextToSize(lopdText, 176), 18, y + 9);

  // --- 8. ACEPTACIÓN Y FIRMA DE LA PERSONA SOCIA ---
  y = 208;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setFillColor(lightGray);
  doc.rect(15, y, 180, 5.5, 'F');
  doc.rect(15, y, 180, 5.5, 'S');
  doc.text('8. ACEPTACIÓN Y FIRMA DE LA PERSONA SOCIA', 18, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Lugar: San Cristóbal de La Laguna      Fecha: ${reqDate}`, 18, y + 10.2);
  doc.text('Firma de la persona solicitante:', 18, y + 16);
  doc.rect(18, y + 17.5, 75, 16.5);

  // --- 9. USO INTERNO DE LA ASOCIACIÓN ---
  y = 244;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setFillColor(lightGray);
  doc.rect(15, y, 180, 5.5, 'F');
  doc.rect(15, y, 180, 5.5, 'S');
  doc.text('9. USO INTERNO DE LA ASOCIACIÓN', 18, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);

  doc.text('Identidad comprobada: [X] Sí   [ ] No', 18, y + 10);
  doc.text('Mayoría de edad comprobada: [X] Sí   [ ] No', 18, y + 15.5);
  doc.text(`Fecha efectiva de admisión: ${reqDate}`, 18, y + 21);

  doc.text('Firma Junta Directiva / Sello:', 115, y + 10);
  doc.rect(115, y + 12, 65, 16);

  // Pie de página legal
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text('Documento interno de admisión. Su contenido deberá aplicarse conjuntamente con los Estatutos, el Reglamento de Régimen Interno y la normativa vigente.', 105, 277, { align: 'center' });

  // --- PÁGINA 2: ANEXO FOTOGRÁFICO ROSTRO DEL SOCIO ---
  const memberPhoto = member.dniFrontImage || member.dni_front_image;

  if (memberPhoto) {
    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(black);
    doc.text('ASOCIACIÓN CANNABICA SVADHISTHANA', 105, 16, { align: 'center' });
    doc.setFontSize(12.5);
    doc.text(`ANEXO: FOTOGRAFÍA OFICIAL DE SOCIO ${memberNum}`, 105, 24, { align: 'center' });
    doc.line(15, 28, 195, 28);

    try {
      doc.addImage(memberPhoto, 'JPEG', 45, 42, 120, 120);
      doc.setFontSize(13);
      doc.text(`Socio/a: ${fullName}`, 105, 172, { align: 'center' });
      doc.setFontSize(11.5);
      doc.text(`N.º de socio/a: ${memberNum}`, 105, 179, { align: 'center' });
    } catch (e) {
      console.error('Error adjuntando foto del socio:', e);
    }
  }

  return doc;
}

export function exportBulkMembersPdf(selectedMembers: AssociationMember[]) {
  selectedMembers.forEach((member, index) => {
    setTimeout(() => {
      const doc = generateSvadhisthanaAltaPdf(member);
      doc.save(`Alta_Socio_${(member as any).memberNumber || member.dniPassport}_Svadhisthana.pdf`);
    }, index * 250);
  });
}