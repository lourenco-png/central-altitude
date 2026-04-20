import { Injectable } from '@nestjs/common';
import { LOGO_BASE64 } from './logo-base64';

// dadosEspecificos JSON structure:
// {
//   tipoLabel?: string,          // ex: "Topografia | T5"
//   contato?: string,            // A/C name
//   descricaoServico?: string,   // bold text in intro paragraph
//   prazo?: string,              // ex: "Até 10 dias após aceite da proposta."
//   escopoSubtitulo?: string,    // ex: "Levantamento Planialtimétrico"
//   escopoItems?: string[],      // bullet list in scope section
//   equipamentos?: string[],     // equipment column
//   maoDeObra?: string[],        // labor column
//   deslocamento?: string[],     // transport column
//   condicoesPagamento?: string, // payment plan text
//   areaM2?: number,             // INFRA_PREDIAL: area in m²
//   valorM2?: number,            // INFRA_PREDIAL: price per m²
// }

@Injectable()
export class PdfService {
  private formatMoeda(value: number): string {
    const fixed = Math.abs(value).toFixed(2);
    const [int, dec] = fixed.split('.');
    const intFormatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `R$ ${intFormatted},${dec}`;
  }

  private formatData(date: Date | string): string {
    const d = new Date(date);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}-${mes}-${ano}`;
  }

  private numeroProposta(orcNumero: number, proposta: any): string {
    const year = new Date(proposta.createdAt).getFullYear();
    const num = String(orcNumero).padStart(4, '0');
    const versao = proposta.versao || 1;
    return `${year}.${num}.V${versao}`;
  }

  private tipoLabelDefault(tipo: string): string {
    switch (tipo) {
      case 'TOPOGRAFIA': return 'Topografia';
      case 'INFRA_PREDIAL': return 'Infraestrutura/Predial';
      default: return 'Serviços de Engenharia';
    }
  }

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
    const orc = proposta.orcamento;
    const cliente = orc.cliente;
    const itens: any[] = orc.itens || [];
    const dados: any = orc.dadosEspecificos || {};

    // ── Dados dinâmicos ──────────────────────────────────────────────────
    const numeroProp = this.numeroProposta(orc.numero, proposta);
    const tipoLabel = dados.tipoLabel || this.tipoLabelDefault(orc.tipo);
    const contato = dados.contato || cliente.nome;
    const dataEmissao = this.formatData(proposta.createdAt);

    const validadeDate = new Date(proposta.createdAt);
    validadeDate.setDate(validadeDate.getDate() + (proposta.validade || 30));
    const validadeStr = this.formatData(validadeDate);

    const descServico = dados.descricaoServico || '';
    const escopoSubtitulo = dados.escopoSubtitulo || '';
    const escopoItems: string[] = dados.escopoItems || [];
    const prazoText: string = dados.prazo || `Até ${proposta.validade || 30} dias após aceite da proposta.`;
    const condicoesPag: string = dados.condicoesPagamento || orc.condicoes || '';

    // ── Itens de investimento ────────────────────────────────────────────
    const investItens: any[] = [...itens];
    if ((orc.tipo === 'INFRA_PREDIAL' || orc.tipo === 'GENERICO') && dados.areaM2 && dados.valorM2) {
      const totalTerra = dados.areaM2 * dados.valorM2;
      investItens.push({
        descricao: 'Projeto de terraplanagem',
        codigo: 'terra',
        unidade: 'm²',
        quantidade: dados.areaM2,
        unitario: dados.valorM2,
        total: totalTerra,
      });
    }
    const totalGeral = investItens.reduce((sum, item) => sum + (item.total || 0), 0);

    // ── Tabela de equipamentos ───────────────────────────────────────────
    const equip: string[] = dados.equipamentos || ['KIT GNSS/RTK (GPS)', 'COMPUTADOR + SOFTWARES', 'ESTAÇÃO TOTAL'];
    const mdo: string[] = dados.maoDeObra || ['01 (UM) TOPÓGRAFO', '01 (UM) AUXILIAR'];
    const desl: string[] = dados.deslocamento || ['01 (UM) VEÍCULO PARA MOBILIZAÇÃO'];
    const maxRows = Math.max(equip.length, mdo.length, desl.length);

    // ── Medidas de layout ────────────────────────────────────────────────
    const MARGIN_H = 56;
    const PAGE_W = 595.28;
    const INNER_W = PAGE_W - MARGIN_H * 2;
    const LOGO = `data:image/png;base64,${LOGO_BASE64}`;

    // ── Corpo do documento ───────────────────────────────────────────────
    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [MARGIN_H, 90, MARGIN_H, 88],
      defaultStyle: { font: 'Helvetica', fontSize: 10, color: '#1a1a1a' },

      images: { logo: LOGO },

      // Fundo cinza apenas na capa
      background: (currentPage: number, pageSize: any) => {
        if (currentPage !== 1) return null;
        return {
          canvas: [{
            type: 'rect',
            x: 0, y: 0,
            w: pageSize.width, h: pageSize.height,
            color: '#e0e0e0',
          }],
        };
      },

      // Logo pequena centrada no topo (pág 2+)
      header: (currentPage: number) => {
        if (currentPage === 1) return null;
        return {
          image: 'logo',
          width: 52,
          alignment: 'center',
          margin: [0, 14, 0, 0],
        };
      },

      // Rodapé com linha dupla + info empresa + paginação (pág 2+)
      footer: (currentPage: number, pageCount: number) => {
        if (currentPage === 1) return null;
        return {
          margin: [MARGIN_H, 6, MARGIN_H, 0],
          stack: [
            {
              canvas: [
                {
                  type: 'line',
                  x1: 0, y1: 0,
                  x2: INNER_W * 0.22, y2: 0,
                  lineWidth: 1.5,
                  lineColor: '#9C6120',
                },
                {
                  type: 'line',
                  x1: INNER_W * 0.22 + 2, y1: 0,
                  x2: INNER_W, y2: 0,
                  lineWidth: 1.5,
                  lineColor: '#2e7d32',
                },
              ],
            },
            {
              columns: [
                {
                  width: '*',
                  stack: [
                    { text: 'Altitude Topografia e Engenharia', bold: true, fontSize: 8 },
                    { text: '(34) 99880-2604 / (34) 99672-5798 - @altitude.te', fontSize: 7.5 },
                    { text: 'lourenco@altitudetopo.com.br / marcosdiego@altitudetopo.com.br', fontSize: 7.5 },
                  ],
                },
                {
                  width: 'auto',
                  text: `Página ${currentPage} de ${pageCount}`,
                  alignment: 'right',
                  fontSize: 8,
                  margin: [0, 2, 0, 0],
                },
              ],
              margin: [0, 5, 0, 0],
            },
          ],
        };
      },

      content: [
        // ────────────────────────────────────────────────────────────────
        // PÁG 1 — CAPA
        // ────────────────────────────────────────────────────────────────
        {
          image: 'logo',
          width: 200,
          absolutePosition: { x: (PAGE_W - 200) / 2, y: 195 },
        },
        {
          stack: [
            {
              text: `${numeroProp} Carta Proposta - ${tipoLabel}`,
              color: '#2e7d32',
              fontSize: 14,
              bold: true,
            },
            {
              text: [
                { text: 'A/C: ', bold: true },
                `${contato} | ${cliente.nome} | ${cliente.cnpj || ''}`,
              ],
              fontSize: 10,
              margin: [0, 6, 0, 0],
            },
            {
              text: [{ text: 'Data: ', bold: true }, dataEmissao],
              fontSize: 10,
              margin: [0, 4, 0, 0],
            },
            {
              text: [{ text: 'Validade: ', bold: true }, validadeStr],
              fontSize: 10,
              margin: [0, 4, 0, 0],
            },
          ],
          absolutePosition: { x: MARGIN_H, y: 660 },
        },
        { text: '', pageBreak: 'after' },

        // ────────────────────────────────────────────────────────────────
        // PÁG 2 — CARTA DE APRESENTAÇÃO
        // ────────────────────────────────────────────────────────────────
        {
          text: ['À ', { text: cliente.nome, bold: true }],
          fontSize: 11,
          margin: [0, 0, 0, 2],
        },
        {
          text: ['A/C.: ', { text: contato, bold: true }],
          fontSize: 10,
          margin: [0, 0, 0, 2],
        },
        {
          text: [
            'Ref: Proposta ',
            { text: `${numeroProp} Carta Proposta - ${tipoLabel}`, bold: true },
          ],
          fontSize: 10,
          margin: [0, 0, 0, 18],
        },
        { text: 'Prezados.', margin: [0, 0, 0, 10] },
        {
          text: 'Em resposta à solicitação, gostaríamos de agradecer a oportunidade e assegurar o nosso total empenho na obtenção de sua plena satisfação.',
          alignment: 'justify',
          margin: [0, 0, 0, 10],
        },
        ...(descServico
          ? [{
              text: [
                'A presente proposta compreende à ',
                { text: descServico, bold: true },
                '.',
              ],
              alignment: 'justify',
              margin: [0, 0, 0, 10],
            }]
          : []),
        {
          text: 'Se considerar que alguma informação necessita de esclarecimentos, é omissa ou não está de acordo com o que foi solicitado, por gentileza, entre em contato conosco para procedermos aos ajustes e esclarecimentos necessários.',
          alignment: 'justify',
          margin: [0, 0, 0, 10],
        },
        {
          text: 'Sem outro assunto de momento, reiteramos o nosso interesse em colaborar com seu projeto e apresentamos os nossos melhores cumprimentos.',
          alignment: 'justify',
          margin: [0, 0, 0, 22],
        },
        { text: 'Atenciosamente,', margin: [0, 0, 0, 44] },
        { text: 'Lourenço Farias | Sócio-Proprietário', bold: true, margin: [0, 0, 0, 2] },
        { text: 'lourenco@altitudetopo.com.br', fontSize: 9.5 },
        { text: '', pageBreak: 'after' },

        // ────────────────────────────────────────────────────────────────
        // PÁG 3 — ESCOPO DO SERVIÇO
        // ────────────────────────────────────────────────────────────────
        { text: 'Escopo do serviço', style: 'sectionTitle' },
        { text: 'A prestação dos serviços compreende:', margin: [0, 0, 0, 16] },
        ...(escopoSubtitulo
          ? [{ text: escopoSubtitulo, bold: true, margin: [0, 0, 0, 10] }]
          : []),
        ...(escopoItems.length > 0
          ? [{ ul: escopoItems, margin: [0, 0, 0, 0] }]
          : []),
        { text: '', pageBreak: 'after' },

        // ────────────────────────────────────────────────────────────────
        // PÁG 4 — EQUIPAMENTOS E MÃO DE OBRA
        // ────────────────────────────────────────────────────────────────
        { text: 'Equipamentos e mão de obra', style: 'sectionTitle' },
        {
          table: {
            headerRows: 1,
            widths: ['*', '*', '*'],
            body: [
              [
                { text: 'EQUIPAMENTOS', bold: true, fontSize: 8.5 },
                { text: 'MÃO DE OBRA', bold: true, fontSize: 8.5 },
                { text: 'DESLOCAMENTO', bold: true, fontSize: 8.5 },
              ],
              ...Array.from({ length: maxRows }, (_, i) => [
                { text: equip[i] || '', fontSize: 9 },
                { text: mdo[i] || '', fontSize: 9 },
                { text: desl[i] || '', fontSize: 9 },
              ]),
            ],
          },
          layout: {
            hLineWidth: (i: number) => (i === 0 || i === 1) ? 0.6 : 0.3,
            vLineWidth: () => 0,
            hLineColor: (i: number) => i === 0 ? '#333' : '#aaa',
            paddingTop: () => 7,
            paddingBottom: () => 7,
            paddingLeft: () => 4,
            paddingRight: () => 4,
          },
          margin: [0, 16, 0, 0],
        },
        { text: '', pageBreak: 'after' },

        // ────────────────────────────────────────────────────────────────
        // PÁG 5 — INVESTIMENTO
        // ────────────────────────────────────────────────────────────────
        { text: 'Investimento', style: 'sectionTitle' },
        { text: 'Os valores para a execução dos serviços são:', margin: [0, 0, 0, 16] },
        {
          table: {
            headerRows: 1,
            widths: ['*', 55, 72, 32, 72],
            body: [
              [
                { text: 'Descrição', style: 'investHeader' },
                { text: 'Código', style: 'investHeader' },
                { text: 'Valor Unit.', style: 'investHeader' },
                { text: 'Qtd.', style: 'investHeader' },
                { text: 'Valor Total', style: 'investHeader', alignment: 'right' },
              ],
              ...investItens.map((item: any) => [
                { text: item.descricao || '', fontSize: 9 },
                { text: item.codigo || '', fontSize: 9 },
                { text: this.formatMoeda(item.unitario || 0), fontSize: 9 },
                { text: String(item.quantidade ?? ''), fontSize: 9 },
                { text: this.formatMoeda(item.total || 0), fontSize: 9, alignment: 'right' },
              ]),
            ],
          },
          layout: {
            hLineWidth: (i: number, node: any) => {
              if (i === 0) return 1;
              if (i === 1) return 0.6;
              if (i === node.table.body.length) return 1;
              return 0.3;
            },
            vLineWidth: () => 0,
            hLineColor: (i: number) => i === 0 ? '#9C6120' : '#ccc',
            paddingTop: () => 5,
            paddingBottom: () => 5,
            paddingLeft: () => 4,
            paddingRight: () => 4,
          },
          margin: [0, 0, 0, 2],
        },
        // Total
        {
          columns: [
            { text: '', width: '*' },
            {
              width: 180,
              table: {
                widths: ['*', 80],
                body: [[
                  { text: 'Total:', bold: true, fontSize: 10, alignment: 'right' },
                  { text: this.formatMoeda(totalGeral), bold: true, fontSize: 10, alignment: 'right' },
                ]],
              },
              layout: {
                hLineWidth: (i: number) => (i === 0 || i === 1) ? 1 : 0,
                vLineWidth: () => 0,
                hLineColor: () => '#333',
                paddingTop: () => 5,
                paddingBottom: () => 5,
                paddingLeft: () => 4,
                paddingRight: () => 4,
              },
            },
          ],
          margin: [0, 0, 0, 28],
        },
        // Plano de pagamentos
        {
          text: 'Plano de pagamentos',
          color: '#2e7d32',
          fontSize: 13,
          alignment: 'center',
          margin: [0, 0, 0, 14],
        },
        ...(condicoesPag
          ? [{ ul: [condicoesPag], margin: [0, 0, 0, 0] }]
          : []),
        { text: '', pageBreak: 'after' },

        // ────────────────────────────────────────────────────────────────
        // PÁG 6 — PRAZOS
        // ────────────────────────────────────────────────────────────────
        { text: 'Prazos', style: 'sectionTitle' },
        ...this.buildPrazosContent(prazoText),
        { text: '', pageBreak: 'after' },

        // ────────────────────────────────────────────────────────────────
        // PÁG 7-8 — CONDIÇÕES GERAIS
        // ────────────────────────────────────────────────────────────────
        ...this.buildCondicoesGerais(cliente.nome),
      ],

      styles: {
        sectionTitle: {
          fontSize: 18,
          bold: false,
          margin: [0, 0, 0, 14],
          color: '#1a1a1a',
        },
        investHeader: {
          bold: true,
          color: '#2e7d32',
          fontSize: 9,
        },
      },
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

  private buildPrazosContent(prazoText: string): any[] {
    const match = prazoText.match(/(\d+\s*dias?)/i);
    if (match) {
      const idx = prazoText.search(/\d/);
      const before = prazoText.substring(0, idx);
      const after = prazoText.substring(idx + match[0].length);
      return [
        {
          text: [
            before,
            { text: match[0], bold: true },
            after,
          ],
          margin: [0, 0, 0, 14],
        },
        {
          text: [
            'Os tempos e valores apresentados são calculados conforme o "Escopo do Serviço", com base no preço-hora dos recursos humanos internos selecionados dentro do horário de trabalho normal ',
            { text: '(dias úteis entre as 07h00 e 17h00)', bold: true },
            ' e no número de horas alocadas a cada um dos recursos.',
          ],
          alignment: 'justify',
        },
      ];
    }
    return [{ text: prazoText, margin: [0, 0, 0, 14] }];
  }

  private buildCondicoesGerais(clienteNome: string): any[] {
    return [
      { text: 'Condições Gerais', style: 'sectionTitle' },
      {
        text: [
          'As seguintes condições complementam as restantes condições particulares apresentadas nesta proposta e que, no seu conjunto, constituem o acordo entre a ',
          { text: clienteNome, bold: true },
          ' e a ',
          { text: 'Altitude Topografia e Engenharia', bold: true },
          '.',
        ],
        alignment: 'justify',
        margin: [0, 0, 0, 14],
      },

      { text: '1. Validade da Proposta', bold: true, margin: [0, 0, 0, 4] },
      {
        text: 'A presente proposta é válida por um período de 30 (trinta) dias contados a partir da data de envio, depois dos quais a proposta é considerada sem efeito.',
        alignment: 'justify',
        margin: [0, 0, 0, 14],
      },

      { text: '2. Confidencialidade', bold: true, margin: [0, 0, 0, 4] },
      {
        text: 'Toda a informação contida neste documento e seus anexos é confidencial, e só poderá ser utilizada pelo CLIENTE no âmbito da avaliação desta proposta.',
        alignment: 'justify',
        margin: [0, 0, 0, 8],
      },
      {
        text: 'O CLIENTE não poderá, direta ou indiretamente utilizar, apresentar, vender, copiar, reproduzir, divulgar ou publicar qualquer informação contida neste documento sem a autorização prévia e por escrito do FORNECEDOR, inclusive para entidades que com ele colaborem e que possam ser eventuais concorrentes.',
        alignment: 'justify',
        margin: [0, 0, 0, 8],
      },
      {
        text: 'O FORNECEDOR compromete-se a garantir a confidencialidade sobre todos os dados disponibilizados pelo CLIENTE e sobre toda a informação que venha a ter conhecimento, não os disponibilizando a quaisquer outras entidades, salvo autorização expressa.',
        alignment: 'justify',
        margin: [0, 0, 0, 14],
      },

      { text: '3. Aprovação de Proposta', bold: true, margin: [0, 0, 0, 4] },
      {
        text: [
          'Você poderá aprovar essa proposta pelo próprio sistema, clicando no botão acima em ',
          { text: 'APROVAR', bold: true },
          '. Em seguida, iremos confirmar o recebimento dessa proposta.',
        ],
        alignment: 'justify',
        margin: [0, 0, 0, 8],
      },
      {
        text: 'A encomenda do serviço é aceite como válida, sempre que a aprovação seja efetuada dentro do prazo de validade da proposta, pelo FORNECEDOR ou por uma pessoa com poderes para o ato em representação deste.',
        alignment: 'justify',
        margin: [0, 0, 0, 14],
      },

      { text: '4. Comunicações e Notificações', bold: true, margin: [0, 0, 0, 4] },
      {
        text: 'Para assegurar clareza e objetividade entre as partes, todas as comunicações, incluindo pedidos, instruções, avisos, aprovações e respostas deverão ser efetuadas por email e através dos interlocutores que cada parte designou como responsável no início dos trabalhos.',
        alignment: 'justify',
        margin: [0, 0, 0, 8],
      },
      {
        text: 'Nenhuma das partes tem a obrigação de aprovar ou responder a qualquer comunicação que não cumpra estas condições.',
        alignment: 'justify',
        margin: [0, 0, 0, 8],
      },
      {
        text: 'As partes podem, a qualquer momento e independentemente do motivo, alterar os interlocutores por si designados desde que o façam mediante aviso prévio.',
        alignment: 'justify',
        margin: [0, 0, 0, 14],
      },

      { text: '5. Alterações', bold: true, margin: [0, 0, 0, 4] },
      {
        text: 'Todos os pedidos de alteração ou outra forma de solicitação estão sujeitos à apreciação da FORNECEDOR, que procederá de uma seguintes formas:',
        alignment: 'justify',
        margin: [0, 0, 0, 8],
      },
      {
        ul: [
          'Se o pedido respeitar o escopo definido na proposta aprovada, o FORNECEDOR procederá à sua implementação dentro do prazo mutuamente acordado entre as partes no âmbito da calendarização dos trabalhos;',
          'Se o pedido exigir uma reformulação estrutural de trabalho ou inclusão de serviços não definidos na proposta aprovada, o FORNECEDOR reserva-se o direito de não as implementar, ficando estas alterações sujeitas a apresentação de nova proposta comercial.',
        ],
        alignment: 'justify',
      },
    ];
  }

  // ── RDO (sem alterações) ────────────────────────────────────────────────
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
