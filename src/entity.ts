export interface Result<T = any> {
    code?: number;
    message?: string;
    data?: T;
}

export interface BaseModel {
    id?: string;
    uuid?: string;
    version?: number;
    deletedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface OrderCallback extends BaseModel {
    endpoint?: string;
}

export interface Order extends BaseModel {
    amount?: number | string;
    description?: string;
    externalId?: string;
    name?: string;
    orderTransactionId?: string;
    status?: string;
    orderCallback?: OrderCallback;
}

export interface MerchantOrder extends BaseModel {
    order?: Order;
    externalIPForCreator?: string;
    externalIPForPayer?: string;
}

export interface UserWalletAttribute extends BaseModel {
    key?: string;
    value?: string;
}

export interface UserWallet extends BaseModel {
    type?: string;
    externalId?: string;
    userWalletAttributes?: UserWalletAttribute[];
}

export interface UserOrder extends BaseModel {
    currency?: string;
    order?: Order;
    userWallet?: UserWallet;
}

// 配置类型
export interface MangroveConfig {
    endpoint: string;
    credential: {
        accessKey: string;
        secretKey: string;
    };
}