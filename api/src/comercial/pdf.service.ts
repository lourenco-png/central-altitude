import { Injectable } from '@nestjs/common';
import { LOGO_BASE64 } from './logo-base64';

@Injectable()
export class PdfService {
  // ── helpers ──────────────────────────────────────────────────────────────
  private fmt(value: number): string {
    const [int, dec] = Math.abs(value).toFixed(2).split('.');
    return `R$ ${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`;
  }

  private fmtData(date: Date | string): string {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  private numProposta(orcNumero: number, proposta: any): string {
    const year = new Date(proposta.createdAt).getFullYear();
    const num = String(orcNumero).padStart(4, '0');
    return `${year}.${num}.V${proposta.versao || 1}`;
  }

  // ── Proposta PDF ──────────────────────────────────────────────────────────
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
    const orc       = proposta.orcamento;
    const cliente   = orc.cliente;
    const itens: any[] = (orc.itens || []).sort((a: any, b: any) => a.ordem - b.ordem);
    const dados: any   = orc.dadosEspecificos || {};

    // ── Dados dinâmicos ────────────────────────────────────────────────────
    const numeroProp   = this.numProposta(orc.numero, proposta);
    const responsavel  = dados.contato || cliente.nome;
    const dataEmissao  = this.fmtData(proposta.createdAt);

    const validadeDate = new Date(proposta.createdAt);
    validadeDate.setDate(validadeDate.getDate() + (proposta.validade || 30));
    const validadeStr  = this.fmtData(validadeDate);

    const descServico      = dados.descricaoServico || '';
    const escopoSubtitulo  = dados.escopoSubtitulo  || '';
    const escopoItems: string[] = dados.escopoItems || [];
    const prazoText        = dados.prazoTexto || `Até ${proposta.validade || 30} dias após aceite da proposta.`;
    const condicoesPag     = dados.condicoesPagamento || orc.condicoes || '';
    const totalGeral       = itens.reduce((s: number, i: any) => s + (i.total || 0), 0);

    // ── Constantes de layout ──────────────────────────────────────────────
    const ML   = 52;          // margem lateral
    const MT   = 48;          // margem topo (pág 2+)
    const MB   = 76;          // margem rodapé
    const PW   = 595.28;      // largura A4
    const PH   = 841.89;      // altura A4
    const IW   = PW - ML * 2; // largura interna
    const LOGO = `data:image/png;base64,${LOGO_BASE64}`;

    // ── Linha separadora verde ─────────────────────────────────────────────
    const hline = (width = IW, color = '#2e7d32') => ({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: width, y2: 0, lineWidth: 0.8, lineColor: color }],
    });

    // ── Rodapé (pág 2+): empresa à esq + logo à dir ──────────────────────
    const footer = (currentPage: number, pageCount: number) => {
      if (currentPage === 1) return null;
      return {
        margin: [ML, 6, ML, 0],
        columns: [
          {
            width: '*',
            stack: [
              hline(IW * 0.55),
              { text: 'Altitude Topografia e Engenharia', bold: true, fontSize: 7.5, margin: [0, 3, 0, 1] },
              { text: '(34) 99880-2604 / (34) 99672-5798 - @altitude.te', fontSize: 7, color: '#555' },
              { text: `Página ${currentPage} de ${pageCount}`, fontSize: 7, color: '#888', margin: [0, 2, 0, 0] },
            ],
          },
          {
            width: 46,
            stack: [{ image: 'logo', width: 42, alignment: 'right', margin: [0, 2, 0, 0] }],
          },
        ],
      };
    };

    // ── Título de seção ────────────────────────────────────────────────────
    const secTitle = (text: string) => ([
      {
        columns: [
          { canvas: [{ type: 'line', x1: 0, y1: 6, x2: 3, y2: 6, lineWidth: 8, lineColor: '#2e7d32' }], width: 10 },
          { text, fontSize: 16, color: '#1a1a1a', margin: [0, 0, 0, 0] },
        ],
        margin: [0, 0, 0, 16],
      },
    ]);

    // ── Tabela de itens (orçamento) ───────────────────────────────────────
    const tabelaItens = () => {
      const rows = itens.map((item: any) => [
        { text: item.descricao || '', fontSize: 9.5 },
        { text: item.codigo || '', fontSize: 9.5, alignment: 'center' },
        { text: item.unidade || 'un', fontSize: 9.5, alignment: 'center' },
        { text: String(item.quantidade ?? ''), fontSize: 9.5, alignment: 'center' },
        { text: this.fmt(item.unitario || 0), fontSize: 9.5, alignment: 'right' },
        { text: this.fmt(item.total || 0), fontSize: 9.5, alignment: 'right', bold: false },
      ]);

      return {
        table: {
          headerRows: 1,
          widths: ['*', 52, 30, 30, 72, 72],
          body: [
            [
              { text: 'Descrição',      fontSize: 9, bold: true, color: '#2e7d32' },
              { text: 'Código',         fontSize: 9, bold: true, color: '#2e7d32', alignment: 'center' },
              { text: 'Unid.',          fontSize: 9, bold: true, color: '#2e7d32', alignment: 'center' },
              { text: 'Qtd.',           fontSize: 9, bold: true, color: '#2e7d32', alignment: 'center' },
              { text: 'Valor Unit.',    fontSize: 9, bold: true, color: '#2e7d32', alignment: 'right' },
              { text: 'Valor Total',    fontSize: 9, bold: true, color: '#2e7d32', alignment: 'right' },
            ],
            ...rows,
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => {
            if (i === 0 || i === node.table.body.length) return 1;
            if (i === 1) return 0.8;
            return 0.3;
          },
          vLineWidth: () => 0,
          hLineColor: (i: number) => i === 0 ? '#2e7d32' : '#ddd',
          paddingTop:    () => 6,
          paddingBottom: () => 6,
          paddingLeft:   () => 4,
          paddingRight:  () => 4,
        },
        margin: [0, 0, 0, 8] as any,
      };
    };

    // ── Bloco de total ─────────────────────────────────────────────────────
    const blocoTotal = () => ({
      columns: [
        { text: '', width: '*' },
        {
          width: 190,
          table: {
            widths: ['*', 90],
            body: [[
              { text: 'TOTAL GERAL:', bold: true, fontSize: 10.5, alignment: 'right', border: [false, true, false, true] },
              { text: this.fmt(totalGeral), bold: true, fontSize: 10.5, alignment: 'right', border: [false, true, false, true] },
            ]],
          },
          layout: {
            hLineColor: () => '#2e7d32',
            hLineWidth: () => 1,
            vLineWidth: () => 0,
            paddingTop:    () => 6,
            paddingBottom: () => 6,
            paddingLeft:   () => 4,
            paddingRight:  () => 4,
          },
        },
      ],
      margin: [0, 2, 0, 0] as any,
    });

    // ════════════════════════════════════════════════════════════════════════
    // DOCUMENTO
    // ════════════════════════════════════════════════════════════════════════
    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [ML, MT, ML, MB],
      defaultStyle: { font: 'Helvetica', fontSize: 10.5, color: '#1a1a1a', lineHeight: 1.45 },
      images: { logo: LOGO },
      footer,

      content: [
        // ══════════════════════════════════════════════════════════════════
        // PÁGINA 1 — CAPA
        // ══════════════════════════════════════════════════════════════════
        // Logo grande centralizado no topo
        {
          image: 'logo',
          width: 210,
          alignment: 'center',
          absolutePosition: { x: (PW - 210) / 2, y: 140 },
        },
        // Logo pequena no canto inferior direito da capa
        {
          image: 'logo',
          width: 40,
          absolutePosition: { x: PW - ML - 40, y: PH - 58 },
        },
        // Bloco inferior da capa
        {
          stack: [
            hline(IW, '#2e7d32'),
            { text: `Proposta Nº ${numeroProp}`, fontSize: 14, bold: true, color: '#2e7d32', margin: [0, 12, 0, 10] },
            {
              table: {
                widths: [80, '*'],
                body: [
                  [{ text: 'Cliente:',      bold: true, border: [false,false,false,false], fontSize: 10.5 }, { text: cliente.nome,  border: [false,false,false,false], fontSize: 10.5 }],
                  [{ text: 'Responsável:',  bold: true, border: [false,false,false,false], fontSize: 10.5 }, { text: responsavel,   border: [false,false,false,false], fontSize: 10.5 }],
                  [{ text: 'Data:',         bold: true, border: [false,false,false,false], fontSize: 10.5 }, { text: dataEmissao,   border: [false,false,false,false], fontSize: 10.5 }],
                ],
              },
              layout: { defaultBorder: false, paddingTop: () => 4, paddingBottom: () => 4, paddingLeft: () => 0, paddingRight: () => 0 },
            },
          ],
          absolutePosition: { x: ML, y: PH - 230 },
          margin: [0, 0, IW, 0],
        },
        { text: '', pageBreak: 'after' },

        // ══════════════════════════════════════════════════════════════════
        // PÁGINA 2 — APRESENTAÇÃO
        // ══════════════════════════════════════════════════════════════════
        ...secTitle('Apresentação'),
        {
          text: 'Prezados,',
          margin: [0, 0, 0, 12],
        },
        {
          text: 'Em resposta à solicitação, gostaríamos de agradecer a oportunidade e assegurar o nosso total empenho na obtenção de sua plena satisfação.',
          alignment: 'justify',
          margin: [0, 0, 0, 10],
        },
        ...(descServico ? [{
          text: [
            'A presente proposta compreende à ',
            { text: descServico, bold: true },
            '.',
          ],
          alignment: 'justify',
          margin: [0, 0, 0, 10],
        }] : [{
          text: 'A presente proposta compreende à Equipe Mensal de Topografia para implantação de loteamento em tempo integral. Obra situada na cidade de Uberlândia-MG.',
          alignment: 'justify',
          margin: [0, 0, 0, 10],
        }]),
        {
          text: 'Se considerar que alguma informação necessita de esclarecimentos, é omissa ou não está de acordo com o que foi solicitado, por gentileza, entre em contato conosco para procedermos aos ajustes e esclarecimentos necessários.',
          alignment: 'justify',
          margin: [0, 0, 0, 10],
        },
        {
          text: 'Sem outro assunto de momento, reiteramos o nosso interesse em colaborar com seu projeto e apresentamos os nossos melhores cumprimentos.',
          alignment: 'justify',
          margin: [0, 0, 0, 28],
        },
        { text: 'Atenciosamente,', margin: [0, 0, 0, 32] },
        { text: 'Lourenço Farias | Sócio-Proprietário', bold: true, margin: [0, 0, 0, 2] },
        { text: 'lourenco@altitudetopo.com.br', fontSize: 9.5, color: '#444', margin: [0, 0, 0, 22] },
        { text: 'Marcos Diego | Sócio-Proprietário', bold: true, margin: [0, 0, 0, 2] },
        { text: 'marcosdiego@altitudetopo.com.br', fontSize: 9.5, color: '#444' },
        { text: '', pageBreak: 'after' },

        // ══════════════════════════════════════════════════════════════════
        // PÁGINA 3 — ESCOPO DO SERVIÇO
        // ══════════════════════════════════════════════════════════════════
        ...secTitle('Escopo do Serviço'),
        ...(escopoSubtitulo ? [{ text: escopoSubtitulo, bold: true, fontSize: 11, margin: [0, 0, 0, 10] }] : []),
        ...(escopoItems.length > 0
          ? [{
              ul: escopoItems.map((item: string) => ({ text: item, margin: [0, 0, 0, 4], alignment: 'justify' })),
              margin: [0, 0, 0, 0],
            }]
          : [{ text: '—', color: '#888', italics: true }]),
        { text: '', pageBreak: 'after' },

        // ══════════════════════════════════════════════════════════════════
        // PÁGINA 4 — ORÇAMENTO
        // ══════════════════════════════════════════════════════════════════
        ...secTitle('Orçamento'),
        { text: 'Os valores para a execução dos serviços são:', margin: [0, 0, 0, 14], color: '#333' },
        tabelaItens(),
        blocoTotal(),
        { text: '', margin: [0, 24, 0, 0] },
        // Forma de pagamento
        {
          stack: [
            hline(IW, '#2e7d32'),
            { text: 'Forma de Pagamento', fontSize: 12, bold: true, color: '#2e7d32', margin: [0, 10, 0, 8] },
            ...(condicoesPag
              ? [{ text: condicoesPag, alignment: 'justify', margin: [0, 0, 0, 0] }]
              : [{ text: 'A definir conforme negociação.', color: '#888', italics: true }]),
          ],
          margin: [0, 4, 0, 0],
        },
        { text: '', pageBreak: 'after' },

        // ══════════════════════════════════════════════════════════════════
        // PÁGINA 5 — CONDIÇÕES GERAIS
        // ══════════════════════════════════════════════════════════════════
        ...secTitle('Condições Gerais'),

        // 1. Prazos
        { text: '1. Prazos', bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
        { text: prazoText, alignment: 'justify', margin: [0, 0, 0, 20] },

        // 2. Validade da Proposta
        { text: '2. Validade da Proposta', bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
        {
          text: [
            'A presente proposta é válida até ',
            { text: validadeStr, bold: true },
            `, correspondendo a ${proposta.validade || 30} (${this.extenso(proposta.validade || 30)}) dias a partir da data de emissão. Após este prazo, a proposta é considerada sem efeito.`,
          ],
          alignment: 'justify',
          margin: [0, 0, 0, 20],
        },

        // 3. Alterações
        { text: '3. Alterações', bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
        {
          text: 'Todos os pedidos de alteração ou outra forma de solicitação estão sujeitos à apreciação da FORNECEDOR, que procederá de uma seguintes formas:',
          alignment: 'justify',
          margin: [0, 0, 0, 8],
        },
        {
          ul: [
            {
              text: 'Se o pedido respeitar o escopo definido na proposta aprovada, o FORNECEDOR procederá à sua implementação dentro do prazo mutuamente acordado entre as partes no âmbito da calendarização dos trabalhos;',
              alignment: 'justify',
              margin: [0, 0, 0, 6],
            },
            {
              text: 'Se o pedido exigir uma reformulação estrutural de trabalho ou inclusão de serviços não definidos na proposta aprovada, o FORNECEDOR reserva-se o direito de não as implementar, ficando estas alterações sujeitas a apresentação de nova proposta comercial.',
              alignment: 'justify',
              margin: [0, 0, 0, 0],
            },
          ],
          margin: [0, 0, 0, 0],
        },
      ],
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

  private extenso(dias: number): string {
    const map: Record<number, string> = {
      7: 'sete', 10: 'dez', 15: 'quinze', 20: 'vinte', 30: 'trinta',
      45: 'quarenta e cinco', 60: 'sessenta', 90: 'noventa',
    };
    return map[dias] || String(dias);
  }

  // ── RDO PDF (inalterado) ──────────────────────────────────────────────────
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
        header:        { fontSize: 16, bold: true, color: '#2E7D32', margin: [0, 0, 0, 16] },
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
