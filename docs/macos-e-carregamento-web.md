# Mac e carregamento web

O Mac usa provisoriamente Electron porque o OTClient nativo anterior, baseado em XQuartz/GLX, apresentou falhas gráficas no M3/macOS Tahoe. O fonte nativo 1.1.0 continua nas releases históricas. Recompilar com assinatura ad-hoc não resolve a incompatibilidade gráfica. Uma retomada futura exige backend gráfico próprio para macOS e testes de jogo em máquinas reais.

O app 1.2.0 abre o cliente web público. No primeiro acesso baixa os recursos; o site pode reutilizar pacotes identificados por SHA-256 entre atualizações. O conteúdo do jogo atualiza ao abrir; atualizar Electron exige baixar um novo app. Perfil, atalhos e cache do aplicativo não são compartilhados automaticamente com o navegador. Deslogue pelo jogo para salvar o minimapa explorado antes de fechar.

Os ZIPs são testados no CI após extração, com verificação de assinatura ad-hoc e abertura até o login. Isso não equivale a notarização pela Apple nem a gameplay em Mac físico. O app solicita somente permissões da origem kaveriel.com.br; não contém ponte nativa, residentes, radar ou credenciais administrativas.
