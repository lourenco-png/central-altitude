import { Injectable } from '@nestjs/common';

@Injectable()
export class PdfService {
  async gerarPropostaPdf(proposta: any): Promise<Buffer> {
    const PdfPrinter = require('pdfmake');

    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    };

    const printer = new PdfPrinter(fonts);
    const orcamento = proposta.orcamento;
    const cliente = orcamento.cliente;
    const itens = orcamento.itens || [];

    const tableBody = [
      [
        { text: '#', style: 'tableHeader' },
        { text: 'Descrição', style: 'tableHeader' },
        { text: 'Qtd', style: 'tableHeader' },
        { text: 'Unit.', style: 'tableHeader' },
        { text: 'Total', style: 'tableHeader' },
      ],
      ...itens.map((item: any, i: number) => [
        (i + 1).toString(),
        item.descricao,
        item.quantidade.toString(),
        `R$ ${item.unitario.toFixed(2)}`,
        `R$ ${item.total.toFixed(2)}`,
      ]),
    ];

    const docDefinition = {
      defaultStyle: { font: 'Helvetica', fontSize: 10 },
      content: [
        { text: 'PROPOSTA COMERCIAL', style: 'header' },
        { text: `Nº ${orcamento.numero}`, style: 'subheader' },
        { text: `Data: ${new Date().toLocaleDateString('pt-BR')}`, margin: [0, 0, 0, 16] },
        { text: 'DADOS DO CLIENTE', style: 'sectionHeader' },
        {
          table: {
            widths: ['*', '*'],
            body: [
              [{ text: 'Cliente:', bold: true }, cliente?.nome || ''],
              [{ text: 'CNPJ:', bold: true }, cliente?.cnpj || ''],
              [{ text: 'E-mail:', bold: true }, cliente?.email || ''],
              [{ text: 'Telefone:', bold: true }, cliente?.telefone || ''],
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 16],
        },
        { text: 'ESCOPO DOS SERVIÇOS', style: 'sectionHeader' },
        {
          table: { headerRows: 1, widths: [20, '*', 40, 60, 60], body: tableBody },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 16],
        },
        {
          columns: [
            { text: '' },
            {
              table: {
                widths: ['*', 80],
                body: [
                  [{ text: 'Subtotal:', bold: true }, `R$ ${(orcamento.total / (1 - orcamento.desconto / 100)).toFixed(2)}`],
                  [{ text: 'Desconto:', bold: true }, `${orcamento.desconto}%`],
                  [{ text: 'TOTAL:', bold: true, fontSize: 12 }, { text: `R$ ${orcamento.total.toFixed(2)}`, bold: true, fontSize: 12 }],
                ],
              },
              layout: 'lightHorizontalLines',
            },
          ],
        },
        orcamento.condicoes ? [
          { text: 'CONDIÇÕES DE PAGAMENTO', style: 'sectionHeader', margin: [0, 16, 0, 4] },
          { text: orcamento.condicoes },
        ] : [],
        proposta.observacoes ? [
          { text: 'OBSERVAÇÕES', style: 'sectionHeader', margin: [0, 16, 0, 4] },
          { text: proposta.observacoes },
        ] : [],
        { text: `Validade da proposta: ${proposta.validade} dias`, margin: [0, 16, 0, 0], italics: true },
        {
          columns: [
            { text: '________________________________\nResponsável Técnico', alignment: 'center', margin: [0, 48, 0, 0] },
            { text: '________________________________\nCliente', alignment: 'center', margin: [0, 48, 0, 0] },
          ],
        },
      ].flat(),
      styles: {
        header: { fontSize: 18, bold: true, color: '#2E7D32', margin: [0, 0, 0, 4] },
        subheader: { fontSize: 13, bold: true, margin: [0, 0, 0, 4] },
        sectionHeader: { fontSize: 11, bold: true, color: '#2E7D32', margin: [0, 8, 0, 4] },
        tableHeader: { bold: true, fillColor: '#E8F5E9' },
      },
      pageMargins: [40, 60, 40, 60],
    };

    return new Promise((resolve, reject) => {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }

  async gerarRdoPdf(rdo: any): Promise<Buffer> {
    const PdfPrinter = require('pdfmake');
    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    };

    const printer = new PdfPrinter(fonts);
    const equipe = rdo.equipe || [];

    const docDefinition = {
      defaultStyle: { font: 'Helvetica', fontSize: 10 },
      content: [
        { text: 'RELATÓRIO DIÁRIO DE OBRA (RDO)', style: 'header' },
        {
          table: {
            widths: ['*', '*'],
            body: [
              [{ text: 'Obra:', bold: true }, rdo.obra?.nome || ''],
              [{ text: 'Data:', bold: true }, new Date(rdo.data).toLocaleDateString('pt-BR')],
              [{ text: 'Clima:', bold: true }, rdo.clima || ''],
              [{ text: 'Cliente:', bold: true }, rdo.obra?.cliente?.nome || ''],
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 16],
        },
        { text: 'ATIVIDADES REALIZADAS', style: 'sectionHeader' },
        { text: rdo.atividades || '-', margin: [0, 0, 0, 16] },
        { text: 'OBSERVAÇÕES', style: 'sectionHeader' },
        { text: rdo.observacoes || '-', margin: [0, 0, 0, 16] },
        { text: 'ASSINATURAS', style: 'sectionHeader' },
        {
          table: {
            widths: ['*', '*', '*'],
            body: [
              [
                { text: 'Nome', bold: true },
                { text: 'Status', bold: true },
                { text: 'Data/Hora', bold: true },
              ],
              ...(rdo.assinaturas || []).map((a: any) => [
                a.nome,
                a.assinado ? 'Assinado' : 'Pendente',
                a.assinadoEm ? new Date(a.assinadoEm).toLocaleString('pt-BR') : '-',
              ]),
            ],
          },
          layout: 'lightHorizontalLines',
        },
      ],
      styles: {
        header: { fontSize: 16, bold: true, color: '#2E7D32', margin: [0, 0, 0, 16] },
        sectionHeader: { fontSize: 11, bold: true, color: '#2E7D32', margin: [0, 8, 0, 4] },
      },
      pageMargins: [40, 60, 40, 60],
    };

    return new Promise((resolve, reject) => {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }
}
