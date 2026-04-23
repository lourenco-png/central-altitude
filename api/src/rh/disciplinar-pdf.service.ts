import { Injectable } from '@nestjs/common';
import { LOGO_BASE64 } from '../comercial/logo-base64';

@Injectable()
export class DisciplinarPdfService {
  private fmtData(date: Date | string): string {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  async gerarPdf(acao: any, funcionario: any, empresa: any): Promise<Buffer> {
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
    const LOGO = `data:image/png;base64,${LOGO_BASE64}`;

    const nomeEmpresa = empresa?.nome || 'ALTITUDE TOPOGRAFIA E ENGENHARIA LTDA';
    const dataDoc = this.fmtData(acao.data);
    const nomeFuncionario = funcionario?.nome || '—';
    const cargoFuncionario = funcionario?.cargo || '—';
    const setor = funcionario?.setor || '—';

    // ── Configurações por tipo ──────────────────────────────────────────────
    type PdfColor = string;
    const tipoConfig: Record<string, { titulo: string; subtitulo: string; cor: PdfColor }> = {
      ADVERTENCIA_VERBAL:  { titulo: 'ADVERTÊNCIA DISCIPLINAR',           subtitulo: 'Advertência Verbal / Registrada',                      cor: '#b45309' },
      ADVERTENCIA_ESCRITA: { titulo: 'ADVERTÊNCIA DISCIPLINAR',           subtitulo: 'Advertência Escrita',                                  cor: '#b45309' },
      SUSPENSAO:           { titulo: 'SUSPENSÃO DISCIPLINAR',             subtitulo: `Suspensão de ${acao.diasSuspensao || 1} dia(s)`,        cor: '#c2410c' },
      JUSTA_CAUSA:         { titulo: 'RESCISÃO POR JUSTA CAUSA',          subtitulo: 'Desídia — Art. 482, "e" da CLT',                       cor: '#991b1b' },
      CARTA_ABANDONO:      { titulo: 'CARTA DE ABANDONO DE EMPREGO',      subtitulo: 'Abandono — Art. 482, "i" da CLT',                      cor: '#6d28d9' },
    };
    const cfg = tipoConfig[acao.tipo] || tipoConfig['ADVERTENCIA_VERBAL'];

    // ── Textos por tipo ─────────────────────────────────────────────────────
    const textoIntro: Record<string, string> = {
      ADVERTENCIA_VERBAL:  'Por meio deste documento, notificamos formalmente o(a) funcionário(a) identificado(a) abaixo acerca da aplicação de ADVERTÊNCIA VERBAL/REGISTRADA:',
      ADVERTENCIA_ESCRITA: 'Por meio deste documento, notificamos formalmente o(a) funcionário(a) identificado(a) abaixo acerca da aplicação de ADVERTÊNCIA ESCRITA:',
      SUSPENSAO:           'Por meio deste documento, comunicamos ao(à) funcionário(a) a aplicação de SUSPENSÃO DISCIPLINAR:',
      JUSTA_CAUSA:         'Comunicamos ao(à) funcionário(a) a decisão desta empresa de rescindir seu contrato de trabalho por JUSTA CAUSA, nos termos do art. 482, alínea "e" (desídia) da CLT:',
      CARTA_ABANDONO:      'Por meio deste documento, notificamos que o(a) funcionário(a) abaixo encontra-se em situação de ABANDONO DE EMPREGO, conforme art. 482, alínea "i" da CLT:',
    };

    const textoComplementar: Record<string, string> = {
      ADVERTENCIA_VERBAL:  'Informamos que a reincidência em infrações desta natureza poderá acarretar medidas disciplinares mais severas, incluindo suspensão e, em caso de persistência, rescisão do contrato de trabalho por justa causa, nos termos do art. 482 da CLT.',
      ADVERTENCIA_ESCRITA: 'Alertamos que nova infração poderá resultar em suspensão disciplinar e, persistindo a conduta, em rescisão do contrato por justa causa, conforme previsto no art. 482 da Consolidação das Leis do Trabalho.',
      SUSPENSAO:           `O(a) funcionário(a) ficará afastado(a) por ${acao.diasSuspensao || 1} dia(s) sem remuneração. Alertamos que nova infração poderá resultar em rescisão do contrato por justa causa, conforme art. 482 da CLT.`,
      JUSTA_CAUSA:         'A presente rescisão foi precedida de advertências e suspensões disciplinares sem melhora de conduta, caracterizando desídia habitual. Na rescisão por justa causa o(a) funcionário(a) não tem direito a aviso prévio, 13º proporcional, férias proporcionais com 1/3 nem multa do FGTS.',
      CARTA_ABANDONO:      'O(a) funcionário(a) não compareceu ao trabalho por 30 (trinta) ou mais dias consecutivos sem justificativa, configurando abandono de emprego. Este documento poderá ser utilizado como prova em eventual processo trabalhista.',
    };

    // ── Linhas da tabela de identificação ─────────────────────────────────
    const linhasTabela: any[][] = [
      [{ text: 'Nome:', bold: true, fontSize: 9 }, { text: nomeFuncionario, fontSize: 9 }],
      [{ text: 'Cargo:', bold: true, fontSize: 9 }, { text: cargoFuncionario, fontSize: 9 }],
      [{ text: 'Setor:', bold: true, fontSize: 9 }, { text: setor, fontSize: 9 }],
    ];

    if (acao.tipo === 'SUSPENSAO') {
      linhasTabela.push([{ text: 'Dias de Suspensão:', bold: true, fontSize: 9 }, { text: `${acao.diasSuspensao || 1} dia(s) sem remuneração`, fontSize: 9 }]);
    }
    if (acao.tipo === 'JUSTA_CAUSA' && funcionario?.admissao) {
      linhasTabela.push([{ text: 'Data de Admissão:', bold: true, fontSize: 9 }, { text: this.fmtData(funcionario.admissao), fontSize: 9 }]);
    }
    linhasTabela.push([{ text: 'Data do Documento:', bold: true, fontSize: 9 }, { text: dataDoc, fontSize: 9 }]);

    // ── Corpo do documento ─────────────────────────────────────────────────
    const corpoItems: any[] = [
      { text: textoIntro[acao.tipo] || '', margin: [0, 0, 0, 10], fontSize: 9.5, color: '#374151' },
      {
        table: { widths: ['38%', '62%'], body: linhasTabela },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 16],
      },
      { text: 'MOTIVO / FUNDAMENTAÇÃO', bold: true, fontSize: 10, color: cfg.cor, margin: [0, 0, 0, 6] },
      { text: acao.motivo || '—', fontSize: 9.5, color: '#111827', margin: [0, 0, 0, 14] },
      { text: textoComplementar[acao.tipo] || '', italics: true, fontSize: 9, color: '#6b7280', margin: [0, 0, 0, 14] },
    ];

    if (acao.observacao) {
      corpoItems.push({ text: `Observação: ${acao.observacao}`, fontSize: 9, color: '#374151', italics: true, margin: [0, 0, 0, 14] });
    }

    // ── Área de assinaturas ────────────────────────────────────────────────
    const assinaturas: any = {
      margin: [0, 28, 0, 0],
      columns: [
        {
          width: '45%',
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 210, y2: 0, lineWidth: 0.8, lineColor: '#9ca3af' }] },
            { text: 'Representante da Empresa', alignment: 'center', fontSize: 8.5, color: '#6b7280', margin: [0, 4, 0, 1] },
            { text: nomeEmpresa, alignment: 'center', fontSize: 7.5, color: '#9ca3af' },
          ],
        },
        { width: '10%', text: '' },
        {
          width: '45%',
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 210, y2: 0, lineWidth: 0.8, lineColor: '#9ca3af' }] },
            { text: 'Funcionário(a)', alignment: 'center', fontSize: 8.5, color: '#6b7280', margin: [0, 4, 0, 1] },
            { text: nomeFuncionario, alignment: 'center', fontSize: 7.5, color: '#9ca3af' },
          ],
        },
      ],
    };

    const rodape: any = {
      text: `Documento gerado em ${this.fmtData(new Date())} · Central Altitude — Sistema de Gestão`,
      alignment: 'center',
      fontSize: 7,
      color: '#d1d5db',
      margin: [0, 20, 0, 0],
    };

    // ── Definição do documento ─────────────────────────────────────────────
    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [52, 100, 52, 60],
      defaultStyle: { font: 'Helvetica', fontSize: 10, color: '#111827', lineHeight: 1.4 },
      styles: {
        header: { fontSize: 14, bold: true, color: '#ffffff' },
      },
      header: {
        margin: [0, 0, 0, 0],
        stack: [
          // Faixa colorida
          {
            canvas: [{ type: 'rect', x: 0, y: 0, w: 595.28, h: 72, color: cfg.cor }],
          },
          // Logo + nome empresa (sobre a faixa)
          {
            columns: [
              { text: nomeEmpresa, color: '#ffffff', bold: true, fontSize: 11, margin: [52, -56, 0, 0], width: '*' },
              { image: 'logo', width: 36, alignment: 'right', margin: [0, -58, 52, 0] },
            ],
          },
          // Título e subtítulo
          { text: cfg.titulo, alignment: 'center', bold: true, fontSize: 13, color: '#ffffff', margin: [52, -22, 52, 2] },
          { text: cfg.subtitulo, alignment: 'center', fontSize: 9, color: 'rgba(255,255,255,0.8)', margin: [52, 0, 52, 0] },
        ],
      },
      content: [
        // Linha divisória
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 491, y2: 0, lineWidth: 0.5, lineColor: '#e5e7eb' }], margin: [0, 0, 0, 16] },
        ...corpoItems,
        assinaturas,
        rodape,
      ],
      images: { logo: LOGO },
    };

    return new Promise((resolve, reject) => {
      try {
        const doc = printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
