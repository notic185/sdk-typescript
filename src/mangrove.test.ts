import { Mangrove } from './mangrove';
import axios from 'axios';
import {MerchantOrder, Order, Result, UserOrder} from './entity';
import CryptoJS from 'crypto-js';


jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const client = new Mangrove({
    endpoint: 'http://10.0.0.254:4003',
    credential: {
        accessKey: 'sbSO9eCvjQkE38hVnrVy4TiD',
        secretKey: 'ER3wT3UP05TVEyh8CdMnZsCz5I1j0z'
    }
});


describe('Test Mangrove', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    const mockOrderUUID = '05bf25dd-103a-4580-96b2-4e30c9736822'

    test('Create Merchant Order', async () => {
        const mockOrder: MerchantOrder = {
            order: {
                amount: 100,
                orderCallback: { endpoint: 'http://127.0.0.1:8888' }
            }
        };
        mockedAxios.request.mockResolvedValue({
            data: { code: 200, data: [mockOrder] }
        });
        const result = await client.merchantOrder.create([mockOrder]);

        expect(result.code).toBe(200);
        expect(result.data?.[0].order?.amount).toBe(100);
    });

    test('Update Merchant Order', async () => {
        const updateData = {
            externalIPForCreator: '192.168.1.100',
            externalIPForPayer: '192.168.1.200'
        };
        const mockResponse: Result<MerchantOrder> = {
            code: 200,
            data: {
                uuid: mockOrderUUID,
                ...updateData,
                order: {
                    uuid: 'order-uuid',
                    amount: 100
                }
            }
        };
        mockedAxios.request.mockResolvedValue({ data: mockResponse });
        const result = await client.merchantOrder.update(mockOrderUUID, updateData);

        expect(result.code).toBe(200);
        expect(result.data?.externalIPForCreator).toBe('192.168.1.100');
        expect(mockedAxios.request).toHaveBeenCalledWith(
            expect.objectContaining({
                method: 'PATCH',
                url: `http://10.0.0.254:4003/v1.2/merchant-order/${mockOrderUUID}`,
                data: updateData
            })
        );
    });

    test('Describe Order', async () => {
        const mockOrder: Order = {
            uuid: mockOrderUUID,
            amount: 8880,
            status: 'completed'
        };
        const mockResponse: Result<Order> = {
            code: 200,
            data: mockOrder
        };
        mockedAxios.request.mockResolvedValue({ data: mockResponse });
        const result = await client.order.get(mockOrderUUID);

        expect(result.data?.uuid).toBe(mockOrderUUID);
        expect(result.data?.amount).toBe(8880);
        expect(mockedAxios.request).toHaveBeenCalledWith(
            expect.objectContaining({
                method: 'GET',
                url: `http://10.0.0.254:4003/v1.2/order/${mockOrderUUID}`
            })
        );
    });

    test('Update Order', async () => {
        const mockUpdate = { description: 'Updated order' };
        mockedAxios.request.mockResolvedValue({
            data: { code: 200, data: mockUpdate }
        });
        const result = await client.order.update(mockOrderUUID, mockUpdate);
        expect(result.data?.description).toBe('Updated order');
    });

    test('Delete Order', async () => {
        const mockResponse: Result = { code: 204 };
        mockedAxios.request.mockResolvedValue({ data: mockResponse });
        const result = await client.order.delete(mockOrderUUID);

        expect(result.code).toBe(204);
        expect(mockedAxios.request).toHaveBeenCalledWith(
            expect.objectContaining({
                method: 'DELETE',
                url: `http://10.0.0.254:4003/v1.2/order/${mockOrderUUID}`
            })
        );
    });

    test('Create UserOrder', async () => {
        const mockUserOrder: UserOrder[] = [{
            currency: '0',
            order: {
                amount: 8880,
                orderCallback: {
                    endpoint: 'http://127.0.0.1:8888'
                },
            }
        }];
        const mockResponse: Result<UserOrder[]> = {
            code: 201,
            data: [{
                ...mockUserOrder[0],
                uuid: 'user-order-uuid',
                order: {
                    ...mockUserOrder[0].order!,
                    uuid: 'order-uuid'
                }
            }]
        };
        mockedAxios.request.mockResolvedValue({ data: mockResponse });
        const result = await client.userOrder.create(mockUserOrder);

        expect(result.code).toBe(201);
        expect(result.data?.[0].order?.uuid).toBe('order-uuid');
        expect(mockedAxios.request).toHaveBeenCalledWith(
            expect.objectContaining({
                method: 'PUT',
                url: 'http://10.0.0.254:4003/v1.2/user-order',
                data: expect.arrayContaining([
                    expect.objectContaining({
                        order: expect.objectContaining({
                            amount: 8880
                        })
                    })
                ])
            })
        );
    });

    test('Handle Signature Verification', () => {
        const mockRequest = {
            method: 'POST',
            path: '/callback',
            headers: {
                'x-guarder-id': 'test-access-key',
                'x-guarder-signed-at': '1234567890',
                'x-guarder-uuid': 'test-uuid',
                authorization: 'Signature valid-sig'
            },
            body: { amount: 100 }
        };
        jest.spyOn(CryptoJS, 'HmacSHA512').mockReturnValue({
            toString: () => 'valid-sig'
        } as any);
        expect(() => client.handleCallback(mockRequest)).not.toThrow();
    });

    test('Throw On Invalid Signature', () => {
        const mockRequest = {
            method: 'POST',
            path: '/callback',
            headers: {
                'x-guarder-id': 'test-access-key',
                'x-guarder-signed-at': '1234567890',
                'x-guarder-uuid': 'test-uuid',
                authorization: 'Signature invalid-sig'
            },
            body: { amount: 100 }
        };
        jest.spyOn(CryptoJS, 'HmacSHA512').mockReturnValue({
            toString: () => 'valid-sig'
        } as any);
        expect(() => client.handleCallback(mockRequest)).toThrow('Invalid signature');
    });
});