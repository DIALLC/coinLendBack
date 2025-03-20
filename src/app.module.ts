import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

import { AuthController } from './controller/auth.controller';
import { SlotController } from './controller/slot.controller';
import { AuthService } from './service/auth.service';
import { SlotService } from './service/slot.service';

import { User } from './model/user.entity';
import { SlotEntity } from './model/slot.entity';
import { SlotPurchase } from './model/slot-purchase.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '12345678',
      database: 'lendingDB3',
      // Включаем нужные сущности
      entities: [User, SlotEntity, SlotPurchase],
      synchronize: false, // На продакшене выключаем
    }),
    TypeOrmModule.forFeature([User, SlotEntity, SlotPurchase]),
    JwtModule.register({
      secret: 'ssKey', // Замените на более безопасный секрет
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController, SlotController],
  providers: [AuthService, SlotService],
})
export class AppModule {}
