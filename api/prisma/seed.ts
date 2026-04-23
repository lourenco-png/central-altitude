import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPass    = process.env.SEED_ADMIN_PASSWORD;
  const marcosPass   = process.env.SEED_MARCOS_PASSWORD;
  const lourencoPass = process.env.SEED_LOURENCO_PASSWORD;

  if (!adminPass || !marcosPass || !lourencoPass) {
    throw new Error(
      'Defina SEED_ADMIN_PASSWORD, SEED_MARCOS_PASSWORD e SEED_LOURENCO_PASSWORD antes de rodar o seed.',
    );
  }

  const hashedPassword = await bcrypt.hash(adminPass, 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@centralaltitude.com' },
    update: {},
    create: {
      email: 'admin@centralaltitude.com',
      password: hashedPassword,
      nome: 'Administrador',
      role: 'ADMIN' as any,
    },
  });
  console.log('Created admin:', admin.email);

  const hashedPasswordMarcos = await bcrypt.hash(marcosPass, 10);
  const marcos = await prisma.user.upsert({
    where: { email: 'marcos.diego@centralaltitude.com' },
    update: {},
    create: {
      email: 'marcos.diego@centralaltitude.com',
      password: hashedPasswordMarcos,
      nome: 'Marcos Diego',
      role: 'MANAGER' as any,
    },
  });
  console.log('Created user:', marcos.email);

  const hashedPasswordLourenco = await bcrypt.hash(lourencoPass, 10);
  const lourenco = await prisma.user.upsert({
    where: { email: 'lourenco@centralaltitude.com' },
    update: {},
    create: {
      email: 'lourenco@centralaltitude.com',
      password: hashedPasswordLourenco,
      nome: 'Lourenco',
      role: 'MANAGER' as any,
    },
  });
  console.log('Created user:', lourenco.email);

  // Empresa
  const empresa = await prisma.empresa.upsert({
    where: { cnpj: '00.000.000/0001-00' },
    update: {},
    create: {
      nome: 'Central Altitude Topografia',
      cnpj: '00.000.000/0001-00',
      email: 'contato@centralaltitude.com',
      telefone: '(11) 3000-0000',
    },
  });
  console.log('Created empresa:', empresa.nome);

  // Clientes
  const cliente1 = await prisma.cliente.upsert({
    where: { cnpj: '11.111.111/0001-11' },
    update: {},
    create: {
      nome: 'Construtech S.A.',
      cnpj: '11.111.111/0001-11',
      email: 'contato@construtech.com',
      telefone: '(11) 4000-0000',
      cidade: 'São Paulo',
    },
  });

  const cliente2 = await prisma.cliente.upsert({
    where: { cnpj: '22.222.222/0001-22' },
    update: {},
    create: {
      nome: 'BR Engenharia',
      cnpj: '22.222.222/0001-22',
      email: 'contato@brengenharia.com',
      telefone: '(11) 5000-0000',
      cidade: 'Campinas',
    },
  });
  console.log('Created clientes');

  // Engenheiros
  const eng1 = await prisma.engenheiro.create({
    data: {
      nome: 'João Silva',
      crea: 'CREA-SP 123456',
      telefone: '(11) 99999-0001',
      email: 'joao@centralaltitude.com',
    },
  });

  const eng2 = await prisma.engenheiro.create({
    data: {
      nome: 'Maria Costa',
      crea: 'CREA-SP 789012',
      telefone: '(11) 99999-0002',
      email: 'maria@centralaltitude.com',
    },
  });
  console.log('Created engenheiros');

  // Obras
  const obra1 = await prisma.obra.create({
    data: {
      nome: 'Res. Vila Madalena',
      clienteId: cliente1.id,
      status: 'ATIVA',
      endereco: 'Rua Harmonia, 500 - Vila Madalena, SP',
    },
  });

  const obra2 = await prisma.obra.create({
    data: {
      nome: 'Condomínio Alphaville',
      clienteId: cliente2.id,
      status: 'ATIVA',
      endereco: 'Alameda Rio Negro, 1000 - Alphaville, SP',
    },
  });
  console.log('Created obras');

  // Solicitações
  const hoje = new Date();
  await prisma.solicitacao.create({
    data: {
      obraId: obra1.id,
      engenheiroId: eng1.id,
      data: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1, 9, 0),
      status: 'AGENDADO',
      observacoes: 'Levantamento planimétrico setor A',
    },
  });

  await prisma.solicitacao.create({
    data: {
      obraId: obra2.id,
      engenheiroId: eng2.id,
      data: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 2, 14, 0),
      status: 'AGENDADO',
    },
  });
  console.log('Created solicitações');

  // Funcionários
  const func1 = await prisma.funcionario.create({
    data: {
      nome: 'João Carlos',
      cpf: '111.111.111-11',
      cargo: 'Topógrafo',
      setor: 'Topografia',
      telefone: '(11) 99999-1111',
      admissao: new Date('2022-03-15'),
      status: 'ATIVO',
    },
  });

  const func2 = await prisma.funcionario.create({
    data: {
      nome: 'Maria Santos',
      cpf: '222.222.222-22',
      cargo: 'Auxiliar de Topografia',
      setor: 'Topografia',
      telefone: '(11) 99999-2222',
      admissao: new Date('2023-01-10'),
      status: 'ATIVO',
    },
  });
  console.log('Created funcionários');

  // EPIs
  const vence3dias = new Date();
  vence3dias.setDate(vence3dias.getDate() + 3);

  await prisma.ePI.create({
    data: {
      funcionarioId: func1.id,
      descricao: 'Capacete de Segurança',
      ca: 'CA-12345',
      validade: vence3dias,
    },
  });

  await prisma.ePI.create({
    data: {
      funcionarioId: func1.id,
      descricao: 'Cinto de Segurança',
      ca: 'CA-67890',
      validade: new Date('2026-09-15'),
    },
  });

  await prisma.ePI.create({
    data: {
      funcionarioId: func2.id,
      descricao: 'Luvas de Proteção',
      ca: 'CA-11111',
      validade: new Date('2026-06-30'),
    },
  });
  console.log('Created EPIs');

  // Pipeline
  await prisma.oportunidade.createMany({
    data: [
      { titulo: 'Nova Obra Tatuapé', clienteId: cliente1.id, valor: 12000, responsavel: 'João Silva', estagio: 'LEAD', ordem: 0 },
      { titulo: 'Expansão Alphaville', clienteId: cliente2.id, valor: 45000, responsavel: 'Maria Costa', estagio: 'FECHADO', ordem: 0 },
    ],
  });
  console.log('Created oportunidades');

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
