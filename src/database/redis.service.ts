// src/modules/database/redis.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { BybitOrder } from '../modules/bybit/bybit.service';
import * as defaultConfig from '../config/trading.config';

@Injectable()
export class RedisService {
  private readonly redis: Redis;
  private readonly logger = new Logger(RedisService.name);
  private readonly CONFIG_KEY = 'app:config';

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
    this.initConfig();
  }

  private async initConfig() {
    try {
      const exists = await this.redis.exists(this.CONFIG_KEY);
      if (!exists) {
        await this.redis.set(this.CONFIG_KEY, JSON.stringify(defaultConfig));
        this.logger.log('Configuration par défaut initialisée dans Redis');
      }
    } catch (error) {
      this.logger.error('Erreur initialisation config:', error);
    }
  }

  async getConfig<T = any>(): Promise<T> {
    try {
      const config = await this.redis.get(this.CONFIG_KEY);
      return config ? JSON.parse(config) : null;
    } catch (error) {
      this.logger.error('Erreur récupération config:', error);
      throw error;
    }
  }

  async updateConfig(config: any): Promise<void> {
    try {
      await this.redis.set(this.CONFIG_KEY, JSON.stringify(config));
      this.logger.log('Configuration mise à jour');
    } catch (error) {
      this.logger.error('Erreur mise à jour config:', error);
      throw error;
    }
  }

  async saveOrder(order: BybitOrder): Promise<void> {
    try {
      const key = `order:${order.id}`;
      await this.redis.hmset(key, {
        ...order,
        timestamp: order.timestamp.toISOString(),
      });
      await this.redis.sadd('orders', order.id);
      this.logger.log(`Ordre sauvegardé: ${order.id}`);
    } catch (error) {
      this.logger.error('Erreur sauvegarde ordre:', error);
      throw error;
    }
  }

  async getOrder(orderId: string): Promise<BybitOrder | null> {
    try {
      const key = `order:${orderId}`;
      const order = await this.redis.hgetall(key);

      if (!Object.keys(order).length) {
        return null;
      }

      return {
        ...order,
        timestamp: new Date(order.timestamp),
        price: parseFloat(order.price),
        quantity: parseFloat(order.quantity),
        stopLoss: parseFloat(order.stopLoss),
        takeProfit: parseFloat(order.takeProfit),
      } as BybitOrder;
    } catch (error) {
      this.logger.error('Erreur récupération ordre:', error);
      throw error;
    }
  }

  async getAllOrders(): Promise<BybitOrder[]> {
    try {
      const orderIds = await this.redis.smembers('orders');
      const orders = await Promise.all(orderIds.map((id) => this.getOrder(id)));
      return orders.filter(Boolean) as BybitOrder[];
    } catch (error) {
      this.logger.error('Erreur récupération ordres:', error);
      throw error;
    }
  }
}
