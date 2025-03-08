import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { ActiveUserId } from 'src/shared/decorators/ActiveUserId';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/me')
  me(@ActiveUserId() userId: string) {
    return this.usersService.getUserById(userId);
  }
<<<<<<< HEAD

  // @Get('/user')
  // getUserByEmail(@ActiveUserId() userId: string, email: string) {
  //   return this.usersService.getUserByEmail(userId, email);
  // }
=======
>>>>>>> c6d1f2aa1f9a697bf3db1397c23395563b1f7dfb
}
