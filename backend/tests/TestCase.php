<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Tests\Traits\MocksKeycloakAuth;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;
    use MocksKeycloakAuth;
}
