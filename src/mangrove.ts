import axios from 'axios';
import { v4 } from 'uuid';
import CryptoJS from 'crypto-js';
import _ from 'lodash';
import {
    Result,
    Order,
    MerchantOrder,
    UserOrder,
    MangroveConfig
} from './entity';
import {Simplifier} from "./utility";


export class Mangrove {
    private readonly config: MangroveConfig;

    constructor(config: MangroveConfig) {
        this.config = config;
    }

    private async request<T>(
        method: string,
        path: string,
        data?: any
    ): Promise<Result<T>> {
        const url = new URL(path, this.config.endpoint).toString();
        const headers = this.generateHeaders(method, path, data);

        try {
            const response = await axios.request<Result<T>>({
                method,
                url,
                headers,
                data
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Request failed: ${error.response?.data?.message || error.message}`);
            }
            throw error;
        }
    }

    // 生成请求头
    private generateHeaders(method: string, path: string, data?: any) {
        const now = Date.now();
        return {
            'content-type': 'application/json',
            'x-guarder-id': this.config.credential.accessKey,
            'x-guarder-signed-at': now.toString(),
            'x-guarder-uuid': v4(),
            authorization: this.generateSignature(method, path, data, now)
        };
    }

    // 生成签名
    private generateSignature(
        method: string,
        path: string,
        data: any,
        timestamp: number
    ): string {
        const body = data ? Simplifier.pileDown(data) : {};
        const sortedBody = _.chain(body)
            .keys()
            .sort()
            .map(key => `${key}=${body[key]}`)
            .join('&')
            .value();

        const host = new URL(this.config.endpoint).host;
        const signatureParts = [
            `${method.toUpperCase()} ${path}`,
            `content-type: application/json`,
            `host: ${host}`,
            `x-guarder-id: ${this.config.credential.accessKey}`,
            `x-guarder-signed-at: ${timestamp}`,
            `x-guarder-uuid: ${v4()}`,
            '',
            sortedBody
        ];

        const signatureString = signatureParts.join('\r\n');
        return `Signature ${CryptoJS.HmacSHA512(
            signatureString,
            this.config.credential.secretKey
        )}`;
    }

    handleCallback(req: {
        method: string;
        path: string;
        headers: Record<string, string>;
        body: any;
    }): any {
        const providedSig = req.headers.authorization?.replace('Signature ', '') || '';
        const computedSig = this.generateSignature(
            req.method,
            req.path,
            req.body,
            Number(req.headers['x-guarder-signed-at'])
        ).replace('Signature ', '');

        if (providedSig !== computedSig) {
            throw new Error('Invalid signature');
        }
        return req.body;
    }

    merchantOrder = {
        create: async (orders: MerchantOrder[]): Promise<Result<MerchantOrder[]>> => {
            return this.request('PUT', '/v1.2/merchant-order', orders);
        },
        update: async (uuid: string, data: Partial<MerchantOrder>): Promise<Result<MerchantOrder>> => {
            return this.request('PATCH', `/v1.2/merchant-order/${uuid}`, data);
        }
    };

    order = {
        get: async (uuid: string): Promise<Result<Order>> => {
            return this.request('GET', `/v1.2/order/${uuid}`);
        },
        update: async (uuid: string, data: Partial<Order>): Promise<Result<Order>> => {
            return this.request('PATCH', `/v1.2/order/${uuid}`, data);
        },
        delete: async (uuid: string): Promise<Result<void>> => {
            return this.request('DELETE', `/v1.2/order/${uuid}`);
        }
    };

    userOrder = {
        create: async (orders: UserOrder[]): Promise<Result<UserOrder[]>> => {
            return this.request('PUT', '/v1.2/user-order', orders);
        }
    };
}