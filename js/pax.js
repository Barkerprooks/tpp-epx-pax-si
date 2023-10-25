'use strict';

const transactionRequestScheme = [
    { key: 'amount', fields: ['transaction', 'tip', 'cashBack', 'fee', 'tax', 'fuel'] },
    { key: 'account', fields: ['number', 'expd', 'cvv', 'ebt', 'voucherNumber', 'force', 'firstName', 'lastName', 'countryCode', 'stateCode', 'cityName', 'email'] },
    { key: 'trace', fields: ['reference', 'invoice', 'auth', 'transaction', 'timestamp', 'ecrTransId'] },
    { key: 'avs', fields: ['zipCode', 'address', 'address2'] },
    { key: 'cashier', fields: [] },
    { key: 'commercial', fields: [] },
    { key: 'moto', fields: [] },
    { key: 'etc', fields: [] },
];

const transactionResponseScheme = [
    { key: 'host', fields: ['responseCode', 'responseMessage', 'authCode', 'reference', 'trace', 'batch'] },
    { key: 'transaction', fields: ['type'] },
    { key: 'amount', fields: ['approved', 'due', 'tip', 'cashBack', 'fee', 'tax', 'balance1', 'balance2'] },
    { key: 'account', fields: ['number', 'entryMode', 'expd', 'ebt', 'voucherNumber', 'newAccountNumber', 'cardType', 'cardHolder', 'cvdCode', 'cvdMessage', 'cardPresent'] },
    { key: 'trace', fields: ['transaction', 'reference', 'timestamp'] },
    { key: 'avs', fields: ['approvalCode', 'message'] },
    { key: 'commercial', fields: ['PONumber', 'customerCode', 'taxExempt', 'taxExemptId', 'merchantTaxId', 'destinationZipCode', 'productDescription'] },
    { key: 'moto', fields: ['mode', 'type', 'secure', 'order', 'installments', 'currentInstallment'] },
    { key: 'etc', fields: ['edcType', 'cardBin', 'programType', 'sn', 'guid', 'tc', 'tvr', 'aid', 'tsi', 'atc', 'applab', 'iad', 'arc', 'cid', 'cvm'] }
];

const ascii = { stx: '\x02', etx: '\x03', fs: '\x1c', us: '\x1f' };

const LRC = (fields) => {
    let lrc = 0;
    for (let i = 1; i < fields.length; i++) {
        switch (typeof fields[i]) {
            case 'string':
                fields[i].split('').forEach(char => lrc ^= char.charCodeAt(0));
                break;
            default: lrc ^= fields[i];
        }
    }
    return String.fromCharCode(lrc);
};

const randomDigits = () => new Array(16).fill(10).map(n => Math.floor(n * Math.random()));

const transactionPayload = (methodCode, extData) => {

    const header = [ascii.stx, 'T00', ascii.fs, '1.28', ascii.fs, methodCode, ascii.fs];
    const buffer = [];

    transactionRequestScheme.forEach(section => {
        let sectionData = '';
        if (extData[section.key])
            sectionData = section.fields.map(field => extData[section.key][field]).join(ascii.us);
        buffer.push(sectionData);
    });

    const payload = [...header, ...buffer.join(ascii.fs), ascii.etx];

    return [...payload, LRC(payload)].join('');
}

const parseResponse = (text) => {
    const [payload, _lrc] = text.replace(ascii.stx, '').split(ascii.etx); // clear the sentinal bytes and isolate the lrc
    const fields = payload.split(ascii.fs).slice(5).map(field => field.split(ascii.us));
    const buffer = {};

    transactionResponseScheme.forEach((section, i) => {
        buffer[section.key] = {};
        section.fields.forEach((field, j) => buffer[section.key][field] = fields[i][j]);
    });

    return buffer;
};

const sale = async ({ amount, tip, tax, cashBack, fee }, host='http://192.168.1.84:10009') => {

    const payload = transactionPayload('01', {
        amount: { transaction: amount, tip, tax, cashBack, fee },
        trace: { reference: randomDigits() }
    });

    const response = await fetch(`${host}/?${btoa(payload)}`);
    const text = await response.text();

    return parseResponse(text);
};