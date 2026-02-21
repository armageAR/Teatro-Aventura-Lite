import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'https://auth.armage.tech',
  realm: 'teatro-aventura-lite',
  clientId: 'teatro-aventura-lite',
});

export default keycloak;