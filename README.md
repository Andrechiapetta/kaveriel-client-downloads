# Kaveriel — OTClient nativo

Download gratuito do cliente do jogador em **https://kaveriel.com.br/downloads**.

A distribuição 1.1.0 usa o OTClient C++ 13.40, com motor e arquivos do jogo instalados no computador. Use a mesma conta, personagens, Fichas, Créditos e Premium do Kaveriel. O navegador continua disponível como outra opção. O aplicativo não contém Electron ou Chromium.

Este repositório publica instaladores, fonte correspondente, instruções e SHA-256. Os pacotes são somente do jogador: não incluem Aren, controladores de residentes, radar privado, credenciais de banco ou chaves administrativas.

## Instalação

- **Windows 10/11 x64:** execute o instalador `.exe`. Instala por usuário, sem exigir administrador, e cria atalhos.
- **macOS 15+:** instale o [XQuartz gratuito](https://www.xquartz.org/) e encerre a sessão do Mac uma vez. Extraia o ZIP para Apple silicon ou Intel e mova `Kaveriel.app` para Aplicativos. Este motor nativo usa X11/GLX e depende do XQuartz.
- **Linux x64:** instale o `.deb` em Ubuntu 22.04+, Debian 12+ ou sistema compatível. A alternativa portátil é o `.tar.gz`: extraia e execute `Kaveriel` dentro da pasta. Precisa de glibc 2.35, GLEW 2.2, OpenGL e X11/XWayland.

Windows ainda não tem certificado de editor. Os motores Mac têm assinatura ad-hoc, sem Developer ID ou notarização. O sistema pode avisar na primeira abertura. No Mac, consulte a [orientação da Apple](https://support.apple.com/pt-br/102445) para autorizar somente este aplicativo após conferir a origem. Mantenha as proteções do sistema ativas.

Confira tamanho e SHA-256 na página oficial ou no arquivo `SHA256SUMS` da release. O fonte correspondente está no arquivo `Kaveriel-1.1.0-native-source.tar.gz`; licenças do OTClient, launcher e bibliotecas acompanham a distribuição.

## Atualizações e preferências

O instalador já inclui os sprites e módulos. Ao abrir, o launcher verifica a assinatura Ed25519 da versão e baixa somente arquivos do jogo alterados, incluindo o motor C++. Cada arquivo é conferido pelo SHA-256 antes da ativação. O pequeno launcher recebe novas versões pelo instalador oficial.

Hotkeys e opções ficam no perfil local, separado do navegador e das atualizações. Lembrar o e-mail é opcional; a senha e a sessão ficam somente em memória. A conexão ao Kaveriel usa HTTPS/WSS com TLS pela porta 443.

Economia, Store, Bless, Premium e viagens usam os módulos públicos do Kaveriel. Mensagens de voz ainda estão disponíveis apenas no navegador.
