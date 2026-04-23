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
    const nomeFuncionario = funcionario.nome;
    const cargoFuncionario = funcionario.cargo;

    let titulo = '';
    let subtitulo = '';
    let corHeader: string = '#1b5e20';
    let corpo: any[] = [];

    // ── Texto por tipo ──────────────────────────────────────────────────────
    if (acao.tipo === 'ADVERTENCIA_VERBAL' || acao.tipo === 'ADVERTENCIA_ESCRITA') {
      titulo = 'ADVERTÊNCIA DISCIPLINAR';
      subtitulo = acao.tipo === 'ADVERTENCIA_VERBAL' ? 'Advertência Verbal/Registrada' : 'Advertência Escrita';
      corHeader = '#b45309'; // amber

      corpo = [
        { text: `Por meio desta, vimos por intermédio deste documento notificar o(a) funcionário(a):`, margin: [0, 0, 0, 8] },
        {
          table: {
            widths: ['35%', '65%'],
            body: [
              [{ text: 'Nome:', bold: true }, nomeFuncionario],
              [{ text: 'Cargo:', bold: true }, cargoFuncionario],
              [{ text: 'Setor:', bold: true }, funcionario.setor || '—'],
              [{ text: 'Data da Advertência:', bold: true }, dataDoc],
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 16],
        },
        { text: 'MOTIVO DA ADVERTÊNCIA', style: 'secTitle' },
        { text: acao.motivo, margin: [0, 6, 0, 16] },
        {
          text: `Informamos que a reincidência em infrações desta natureza poderá acarretar medidas disciplinares mais severas, incluindo suspensão e, em caso de persistência, rescisão do contrato de trabalho por justa causa, nos termos do artigo 482 da Consolidação das Leis do Trabalho (CLT).`,
          italics: true,
          margin: [0, 0, 0, 16],
          color: '#374151',
        },
        acao.observacao ? { text: `Observações: ${acao.observacao}`, margin: [0, 0, 0, 16], italics: true } : {},
      ];
    } else if (acao.tipo === 'SUSPENSAO') {
      titulo = 'SUSPENSÃO DISCIPLINAR';
      subtitulo = `Suspensão de ${acao.diasSuspensao || 1} a ${acao.diasSuspensao || 1} dia(s)`;
      corHeader = '#c2410c'; // orange

      corpo = [
        { text: `Por meio deste documento, comunicamos ao(à) funcionário(a) a aplicação de SUSPENSÃO DISCIPLINAR:`, margin: [0, 0, 0, 8] },
        {
          table: {
            widths: ['35%', '65%'],
            body: [
              [{ text: 'Nome:', bold: true }, nomeFuncionario],
              [{ text: 'Cargo:', bold: true }, cargoFuncionario],
              [{ text: 'Setor:', bold: true }, funcionario.setor || '—'],
              [{ text: 'Data da Suspensão:', bold: true }, dataDoc],
              [{ text: 'Duração:', bold: true }, `${acao.diasSuspensao || 1} dia(s) sem remuneração`],
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 16],
        },
        { text: 'MOTIVO DA SUSPENSÃO', style: 'secTitle' },
        { text: acao.motivo, margin: [0, 6, 0, 16] },
        {
          text: `O(a) funcionário(a) deverá retornar às suas atividades no prazo estabelecido. Alertamos que nova infração poderá resultar em rescisão do contrato de trabalho por justa causa, conforme art. 482 da CLT.`,
          italics: true,
          margin: [0, 0, 0, 16],
          color: '#374151',
        },
        acao.observacao ? { text: `Observações: ${acao.observacao}`, margin: [0, 0, 0, 16], italics: true } : {},
      ];
    } else if (acao.tipo === 'JUSTA_CAUSA') {
      titulo = 'TERMO DE RESCISÃO POR JUSTA CAUSA';
      subtitulo = 'Rescisão contratual por desídia — Art. 482, "e" da CLT';
      corHeader = '#991b1b'; // red

      corpo = [
        { text: `Comunicamos ao(à) funcionário(a) a decisão desta empresa de rescindir seu contrato de trabalho por JUSTA CAUSA, nos termos do art. 482, alínea "e" (desídia no desempenho das funções) da Consolidação das Leis do Trabalho:`, margin: [0, 0, 0, 8] },
        {
          table: {
            widths: ['35%', '65%'],
            body: [
              [{ text: 'Nome:', bold: true }, nomeFuncionario],
              [{ text: 'Cargo:', bold: true }, cargoFuncionario],
              [{ text: 'Setor:', bold: true }, funcionario.setor || '—'],
              [{ text: 'Data de Admissão:', bold: true }, funcionario.admissao ? this.fmtData(funcionario.admissao) : '—'],
              [{ text: 'Data da Rescisão:', bold: true }, dataDoc],
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 16],
        },
        { text: 'FUNDAMENTOS DA RESCISÃO', style: 'secTitle' },
        { text: acao.motivo, margin: [0, 6, 0, 16] },
        {
          text: `A presente rescisão foi precedida de advertências verbais, advertências escritas e suspensões disciplinares, sem que houvesse melhora no comportamento do(a) funcionário(a), caracterizando desídia habitual conforme tipificado na legislação trabalhista vigente.`,
          margin: [0, 0, 0, 16],
          color: '#374151',
        },
        {
          text: `Na rescisão por justa causa o(a) funcionário(a) tem direito apenas ao saldo de salário do mês em curso, não fazendo jus a aviso prévio, 13º salário proporcional, férias proporcionais acrescidas de 1/3 e multa do FGTS.`,
          italics: true,
          color: '#6b7280',
          margin: [0, 0, 0, 16],
        },
        acao.observacao ? { text: `Observações: ${acao.observacao}`, margin: [0, 0, 0, 16], italics: true } : {},
      ];
    } else if (acao.tipo === 'CARTA_ABANDONO') {
      titulo = 'CARTA DE ABANDONO DE EMPREGO';
      subtitulo = 'Notificação formal de abandono — Art. 482, "i" da CLT';
      corHeader = '#6d28d9'; // purple

      corpo = [
        { text: `Por meio deste documento, notificamos que o(a) funcionário(a) abaixo identificado(a) encontra-se em situação de ABANDONO DE EMPREGO, conforme art. 482, alínea "i" da CLT:`, margin: [0, 0, 0, 8] },
        {
          table: {
            widths: ['35%', '65%'],
            body: [
              [{ text: 'Nome:', bold: true }, nomeFuncionario],
              [{ text: 'Cargo:', bold: true }, cargoFuncionario],
              [{ text: 'Setor:', bold: true }, funcionario.setor || '—'],
              [{ text: 'Data da Notificação:', bold: true }, dataDoc],
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 16],
        },
        { text: 'FUNDAMENTAÇÃO', style: 'secTitle' },
        { text: acao.motivo, margin: [0, 6, 0, 16] },
        {
          text: `O(a) funcionário(a) não compareceu ao trabalho por 30 (trinta) ou mais dias consecutivos, sem qualquer justificativa plausível ou comunicação à empresa, configurando abandono de emprego nos termos da legislação vigente.`,
          margin: [0, 0, 0, 16],
          color: '#374151',
        },
        {
          text: `Esta carta poderá ser utilizada como prova documental em eventuais processos trabalhistas, juntamente com os registros de ponto e demais evidências de ausência injustificada.`,
          italics: true,
          color: '#6b7280',
          margin: [0, 0, 0, 16],
        },
        acao.observacao ? { text: `Observações: ${acao.observacao}`, margin: [0, 0, 0, 16], italics: true } : {},
      ];
    }

    // ── Rodapé de assinatura ────────────────────────────────────────────────
    const assinaturas = [
      {
        columns: [
          {
            stack: [
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 1, lineColor: '#9ca3af' }] },
              { text: 'Representante da Empresa', alignment: 'center', fontSize: 9, color: '#6b7280', margin: [0, 4, 0, 2] },
              { text: nomeEmpresa, alignment: 'center', fontSize: 8, color: '#9ca3af' },
            ],
            width: '45%',
          },
          { width: '10%', text: '' },
          {
            stack: [
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 1, lineColor: '#9ca3af' }] },
              { text: 'Funcionário(a)', alignment: 'center', fontSize: 9, color: '#6b7280', margin: [0, 4, 0, 2] },
              { text: nomeFuncionario, alignment: 'center', fontSize: 8, color: '#9ca3af' },
            ],
            width: '45%',
          },
        ],
        margin: [0, 32, 0, 0],
      },
      { text: `Documento gerado em ${this.fmtData(new Date())} · Central Altitude — Sistema de Gestão`, alignment: 'center', fontSize: 7, color: '#9ca3af', margin: [0, 24, 0, 0] },
    ];

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [52, 48, 52, 60],
      defaultStyle: { font: 'Helvetica', fontSize: 10, color: '#111827', lineHeight: 1.4 },
      styles: {
        secTitle: { bold: true, fontSize: 10, color: corHeader, margin: [0, 4, 0, 2] },
      },
      content: [
        // Header colorido
        {
          canvas: [{ type: 'rect', x: -52, y: -48, w: 595, h: 56, color: corHeader }],
          margin: [0, 0, 0, 0],
        },
        {
          columns: [
            { text: nomeEmpresa, color: '#ffffff', bold: true, fontSize: 12, margin: [-52, -50, 0, 0] },
            { image: 'logo', width: 40, alignment: 'right', margin: [0, -52, -52, 0] },
          ],
        },
        {
          text: titulo,
          alignment: 'center',
          bold: true,
          fontSize: 15,
          color: corHeader,
          margin: [0, 20, 0, 2],
        },
        {
          text: subtitulo,
          alignment: 'center',
          fontSize: 10,
          color: '#6b7280',
          margin: [0, 0, 0, 20],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 491, y2: 0, lineWidth: 1, lineColor: '#e5e7eb' }], margin: [0, 0, 0, 16] },
        ...corpo,
        ...assinaturas,
      ],
    };

    docDefinition.images = { logo: LOGO };

    return new Promise((resolve, reject) => {
      const doc = printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }
}
