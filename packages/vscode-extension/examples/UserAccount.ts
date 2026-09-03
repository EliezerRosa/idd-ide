function intent(contract: string): MethodDecorator {
  return () => undefined;
}

class UserAccount {
  failedLoginCount = 0;
  lastFailedLoginAt?: Date;
  email = 'user@example.com';

  @intent('registerFailedLoginAttempt')
  registerFailedLoginAttempt(): void {
    this.failedLoginCount += 1;
    this.lastFailedLoginAt = new Date();
    this.email = 'locked@example.com';
  }
}