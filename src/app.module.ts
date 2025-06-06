import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthController } from './controller/auth.controller';
import { PlanetsController } from './controller/planet.controller';
import { CitiesController } from './controller/city.controller';
import { SessionParticipantsController } from './controller/session-participants.controller';
import { WalletController } from './controller/wallet.controller';

import { AuthService } from './service/auth.service';
import { PlanetsService } from './service/planet.service';
import { CitiesService } from './service/city.service';
import { SessionsService } from './service/sessions.service';
import { SessionParticipantsService } from './service/session-participants.service';
import { UsersService } from './service/users.service';
import { WalletService } from './service/wallet.service';

import { User } from './model/user.entity';
import { City } from './model/cities.entity';
import { Planet } from './model/planets.entity';
import { Session } from './model/session.entity';
import { SessionParticipant } from './model/session-participant.entity';
import { Transaction } from './model/transaction.entity';
import { SessionHistory } from './model/session-history.entity';
import { ParticipantHistory } from './model/participant-history.entity';

import { JwtStrategy } from './strategy/jwt.strategy';
import { SessionsGateway } from './gateway/sessions.gateway';
import { Deposit } from './model/deposit.entity';
import { Withdrawal } from './model/withdrawal.entity';
import { PaymentCron } from './cron/payment.cron';
import { EtherService } from './service/ether.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'zR4ZYH2khDwmqfNc@',
      database: 'gameDev',
      entities: [
        User,
        City,
        Planet,
        Session,
        SessionParticipant,
        Transaction,
        SessionHistory,
        ParticipantHistory,
        Deposit,
        Withdrawal,
      ],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([
      User,
      City,
      Planet,
      Session,
      SessionParticipant,
      Transaction,
      SessionHistory,
      ParticipantHistory,
      Deposit,
      Withdrawal,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET', 'dev-secret'),
        signOptions: { expiresIn: '30d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    AuthController,
    PlanetsController,
    CitiesController,
    SessionParticipantsController,
    WalletController,
  ],
  providers: [
    AuthService,
    PlanetsService,
    CitiesService,
    SessionsService,
    SessionParticipantsService,
    UsersService,
    WalletService,
    JwtStrategy,
    SessionsGateway,
    PaymentCron,
    EtherService,
  ],
})
export class AppModule {}
