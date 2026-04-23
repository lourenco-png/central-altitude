import { Injectable } from '@nestjs/common';
import { LOGO_BASE64 } from '../comercial/logo-base64';

@Injectable()
export class DisciplinarPdfService {
  private fmtData(date: Date | string): string {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  async gerarPdf(acao: any, funcionario: any, empresa: any, faltasVinculadas: any[] = []): Promise<Buffer> {
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
    const dataDoc     = this.fmtData(acao.data);
    const nomeFuncionario  = funcionario?.nome  || '—';
    const cargoFuncionario = funcionario?.cargo || '—';
    const setor            = funcionario?.setor || '—';

    // ── Labels por tipo ─────────────────────────────────────────────────────
    const tipoLabel: Record<string, string> = {
      ADVERTENCIA_VERBAL:  'ADVERTÊNCIA DISCIPLINAR — Verbal / Registrada',
      ADVERTENCIA_ESCRITA: 'ADVERTÊNCIA DISCIPLINAR — Escrita',
      SUSPENSAO:           `SUSPENSÃO DISCIPLINAR — ${acao.diasSuspensao || 1} dia(s)`,
      JUSTA_CAUSA:         'RESCISÃO POR JUSTA CAUSA — Desídia (Art. 482, "e" da CLT)',
      CARTA_ABANDONO:      'CARTA DE ABANDONO DE EMPREGO (Art. 482, "i" da CLT)',
    };

    const textoIntro: Record<string, string> = {
      ADVERTENCIA_VERBAL:  'Por meio deste documento, notificamos formalmente o(a) funcionário(a) identificado(a) abaixo acerca da aplicação de ADVERTÊNCIA VERBAL/REGISTRADA:',
      ADVERTENCIA_ESCRITA: 'Por meio deste documento, notificamos formalmente o(a) funcionário(a) identificado(a) abaixo acerca da aplicação de ADVERTÊNCIA ESCRITA:',
      SUSPENSAO:           'Por meio deste documento, comunicamos ao(à) funcionário(a) a aplicação de SUSPENSÃO DISCIPLINAR sem remuneração:',
      JUSTA_CAUSA:         'Comunicamos ao(à) funcionário(a) a decisão desta empresa de rescindir seu contrato de trabalho por JUSTA CAUSA, nos termos do art. 482, alínea "e" (desídia) da CLT:',
      CARTA_ABANDONO:      'Por meio deste documento, notificamos que o(a) funcionário(a) abaixo encontra-se em situação de ABANDONO DE EMPREGO, conforme art. 482, alínea "i" da CLT:',
    };

    const textoComplementar: Record<string, string> = {
      ADVERTENCIA_VERBAL:  'Informamos que a reincidência em infrações desta natureza poderá acarretar medidas disciplinares mais severas, incluindo suspensão e, em caso de persistência, rescisão do contrato de trabalho por justa causa, nos termos do art. 482 da CLT.',
      ADVERTENCIA_ESCRITA: 'Alertamos que nova infração poderá resultar em suspensão disciplinar e, persistindo a conduta, em rescisão do contrato por justa causa, conforme previsto no art. 482 da Consolidação das Leis do Trabalho.',
      SUSPENSAO:           `O(a) funcionário(a) ficará afastado(a) por ${acao.diasSuspensao || 1} dia(s) sem remuneração a partir da data deste documento. Alertamos que nova infração poderá resultar em rescisão por justa causa, conforme art. 482 da CLT.`,
      JUSTA_CAUSA:         'A presente rescisão foi precedida de advertências e suspensões disciplinares sem melhora de conduta, caracterizando desídia habitual. Na rescisão por justa causa o(a) funcionário(a) não tem direito a aviso prévio, 13º proporcional, férias proporcionais com 1/3 nem multa do FGTS.',
      CARTA_ABANDONO:      'O(a) funcionário(a) não compareceu ao trabalho por 30 (trinta) ou mais dias consecutivos sem justificativa, configurando abandono de emprego. Este documento poderá ser utilizado como prova em eventual processo trabalhista.',
    };

    // ── Tabela de identificação ─────────────────────────────────────────────
    const linhasTabela: any[][] = [
      [{ text: 'Nome:',              bold: true, fontSize: 9 }, { text: nomeFuncionario,  fontSize: 9 }],
      [{ text: 'Cargo:',             bold: true, fontSize: 9 }, { text: cargoFuncionario, fontSize: 9 }],
      [{ text: 'Setor:',             bold: true, fontSize: 9 }, { text: setor,            fontSize: 9 }],
    ];

    if (acao.tipo === 'SUSPENSAO') {
      linhasTabela.push([
        { text: 'Dias de Suspensão:', bold: true, fontSize: 9 },
        { text: `${acao.diasSuspensao || 1} dia(s) sem remuneração`, fontSize: 9 },
      ]);
    }
    if (acao.tipo === 'JUSTA_CAUSA' && funcionario?.admissao) {
      linhasTabela.push([
        { text: 'Data de Admissão:', bold: true, fontSize: 9 },
        { text: this.fmtData(funcionario.admissao), fontSize: 9 },
      ]);
    }
    linhasTabela.push([
      { text: 'Data do Documento:', bold: true, fontSize: 9 },
      { text: dataDoc, fontSize: 9 },
    ]);

    // ── Corpo ───────────────────────────────────────────────────────────────
    const corpoItems: any[] = [
      {
        text: textoIntro[acao.tipo] || '',
        margin: [0, 0, 0, 10],
        fontSize: 9.5,
        color: '#374151',
      },
      {
        table: { widths: ['38%', '62%'], body: linhasTabela },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 14],
      },
      {
        text: 'MOTIVO / FUNDAMENTAÇÃO',
        bold: true,
        fontSize: 9.5,
        color: '#111827',
        margin: [0, 0, 0, 5],
      },
      {
        text: acao.motivo || '—',
        fontSize: 9.5,
        color: '#374151',
        margin: [0, 0, 0, 12],
      },
    ];

    // ── Faltas vinculadas ───────────────────────────────────────────────────
    if (faltasVinculadas.length > 0) {
      const tipoFaltaLabel: Record<string, string> = {
        FALTA: 'Falta',
        ATRASO: 'Atraso',
        SAIDA_ANTECIPADA: 'Saída Antecipada',
      };

      corpoItems.push({
        text: 'FALTAS QUE ORIGINARAM ESTA AÇÃO',
        bold: true,
        fontSize: 9.5,
        color: '#111827',
        margin: [0, 0, 0, 5],
      });
      corpoItems.push({
        table: {
          widths: ['30%', '35%', '35%'],
          body: [
            [
              { text: 'Data',          bold: true, fontSize: 8.5, fillColor: '#f3f4f6' },
              { text: 'Tipo',          bold: true, fontSize: 8.5, fillColor: '#f3f4f6' },
              { text: 'Justificada?',  bold: true, fontSize: 8.5, fillColor: '#f3f4f6' },
            ],
            ...faltasVinculadas.map((f) => [
              { text: this.fmtData(f.data),                           fontSize: 8.5 },
              { text: tipoFaltaLabel[f.tipo] || f.tipo,               fontSize: 8.5 },
              { text: f.justificada ? 'Sim' : 'Não',                  fontSize: 8.5 },
            ]),
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 12],
      });
    }

    corpoItems.push({
      text: textoComplementar[acao.tipo] || '',
      italics: true,
      fontSize: 9,
      color: '#6b7280',
      margin: [0, 0, 0, 12],
    });

    if (acao.observacao) {
      corpoItems.push({
        text: `Observação: ${acao.observacao}`,
        fontSize: 9,
        color: '#374151',
        italics: true,
        margin: [0, 0, 0, 12],
      });
    }

    // ── Assinaturas ─────────────────────────────────────────────────────────
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

    // ── Cabeçalho centralizado (sem barra colorida) ─────────────────────────
    const cabecalho: any[] = [
      // Logo centralizada
      {
        image: 'logo',
        width: 60,
        alignment: 'center',
        margin: [0, 0, 0, 6],
      },
      // Nome da empresa
      {
        text: nomeEmpresa,
        alignment: 'center',
        bold: true,
        fontSize: 12,
        color: '#111827',
        margin: [0, 0, 0, 2],
      },
      // Título do documento
      {
        text: tipoLabel[acao.tipo] || 'DOCUMENTO DISCIPLINAR',
        alignment: 'center',
        bold: true,
        fontSize: 11,
        color: '#374151',
        margin: [0, 0, 0, 4],
      },
      // Linha divisória
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 491, y2: 0, lineWidth: 0.8, lineColor: '#d1d5db' }],
        margin: [0, 0, 0, 14],
      },
    ];

    // ── Definição do documento ──────────────────────────────────────────────
    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [52, 48, 52, 60],
      defaultStyle: { font: 'Helvetica', fontSize: 10, color: '#111827', lineHeight: 1.4 },
      content: [
        ...cabecalho,
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
