# Kaveriel — cliente oficial

Baixe o aplicativo do jogador em **https://kaveriel.com.br/downloads**.

Windows, macOS (Apple silicon e Intel) e Linux usam a mesma conta, personagens, mundo e cliente público de https://kaveriel.com.br. O aplicativo abre o motor do jogo em uma janela própria e precisa de internet. As configurações ficam no perfil local do app, separado do navegador.

Este repositório publica somente instaladores, instruções e verificações. Os arquivos dos residentes, dados de jogadores, credenciais e código privado de operação não fazem parte dele.

## Instalação

- Windows: execute o instalador `.exe`. Instala por usuário e cria atalhos.
- Mac: extraia o ZIP correspondente ao processador e mova `Kaveriel.app` para Aplicativos.
- Linux: permita executar o AppImage nas propriedades do arquivo ou instale o `.deb` em Debian/Ubuntu.

A versão inicial para Windows não tem certificado de editor; o Mac usa assinatura ad-hoc, sem Developer ID e sem notarização. O sistema pode pedir uma confirmação na primeira abertura. No Mac, consulte https://support.apple.com/pt-br/102445 para autorizar somente o app após conferir sua origem. Não desative as proteções do sistema.

Confira o tamanho e SHA-256 na página oficial ou no arquivo `SHA256SUMS` da release. Os componentes Electron e Chromium mantêm seus avisos de licença dentro dos pacotes.

## Atualizações

O conteúdo do jogo acompanha o cliente público no site. Novas versões do aplicativo são disponibilizadas na página de downloads; instale a mais recente para atualizar o runtime.
