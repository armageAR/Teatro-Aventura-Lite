<?php

return [
    'url' => env('KEYCLOAK_URL'),
    'realm' => env('KEYCLOAK_REALM'),
    'client_id' => env('KEYCLOAK_CLIENT_ID'),
    'client_secret' => env('KEYCLOAK_CLIENT_SECRET'),
    'realm_url' => env('KEYCLOAK_URL') . '/realms/' . env('KEYCLOAK_REALM'),
];