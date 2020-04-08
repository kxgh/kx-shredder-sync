'use strict';
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const fl = new (require('@kxghnpm/kx-file-lister-sync'))({
    blackList: ['.exe', '.dll', '.so', '.dat', '.xml', '.js', '.log', '.o', '.efi', '.prx', '.sh', '.rs', '.bat']
});

/**
 * Shred strategies.
 * @type {Readonly<{US_DOD: symbol, FF_BYTES: symbol, RANDOM_BYTES: symbol, ZERO_BYTES: symbol}>}
 */
const strategies = Object.freeze({
    US_DOD: Symbol('stgUsDod'),
    ZERO_BYTES: Symbol('stgZeroBytes'),
    FF_BYTES: Symbol('stgFfBytes'),
    RANDOM_BYTES: Symbol('stgRandomBytes')
});

/**
 * @param {number} file descriptor
 * @param {number} fileSize file size
 * @param {object} opts options
 */
const shred = (file, fileSize, opts) => {
    const BUFFER_SIZE = opts.bufferSize;
    const getZeroBuffer = (function () {
        const buffer = Buffer.alloc(BUFFER_SIZE, 0x00);
        return function () {
            return buffer;
        }
    })();

    const getFFBuffer = (function () {
        const buffer = Buffer.alloc(BUFFER_SIZE, 0xFF);
        return function () {
            return buffer;
        }
    })();

    const getRandomBuffer = (function () {
        const buffer = Buffer.allocUnsafe(BUFFER_SIZE);
        return function () {
            crypto.randomFillSync(buffer, 0, BUFFER_SIZE);
            return buffer;
        }
    })();

    const iters = Math.floor(fileSize / opts.bufferSize),
        remainder = fileSize % opts.bufferSize;
    const writeFromBuffer = buff => {
        for (let i = 0, pos = 0; i < iters; i++, pos += opts.bufferSize) {
            fs.writeSync(file, buff(), 0, opts.bufferSize, pos);
        }
        fs.writeSync(file, buff(), 0, remainder, fileSize - remainder);
    };
    for (let pass = 0; pass < opts.passCount; pass++)
        switch (opts.strategy) {
            case strategies.US_DOD:
                writeFromBuffer(getZeroBuffer);
                fs.fdatasyncSync(file);
                writeFromBuffer(getFFBuffer);
                fs.fdatasyncSync(file);
                writeFromBuffer(getRandomBuffer);
                fs.fdatasyncSync(file);
                break;
            case strategies.FF_BYTES:
                writeFromBuffer(getFFBuffer);
                fs.fdatasyncSync(file);
                break;
            case strategies.ZERO_BYTES:
                writeFromBuffer(getZeroBuffer);
                fs.fdatasyncSync(file);
                break;
            case strategies.RANDOM_BYTES:
                writeFromBuffer(getRandomBuffer);
                fs.fdatasyncSync(file);
                break;
        }
};

/**
 * Creates a synchronous shredder file shredder.
 * @param {Object} opts file shredder options
 * @param {Object} [opts.fileLister] file lister that will be used to navigate through directories when mass shredding
 * @param {number} [opts.bufferSize] write buffer chunk size in bytes
 * @param {symbol} [opts.strategy] the strategy to be used. Refer to strategies exported by this module. Default US_DOD
 * @param {number} [opts.passCount] how many times should shredding strategy be used on a file
 * @param {Function} [opts.log] logger function that will be passed a string indicating progress of mass shredding.
 */
function createShredder(opts = {}) {
    const sh = {
        opts: {
            fileLister: fl,
            bufferSize: 65536,
            strategy: strategies.US_DOD,
            passCount: 1,
            log: s=>console.log(s)
        },

        /**
         * Shreds a file.
         * Shreds one file using specified strategy.
         * @param {string} targetFilePath path to the file
         * @param {boolean} unlink whether the file should also be unlinked. False by default
         */
        shredOne: (targetFilePath, unlink) => {
            const fd = fs.openSync(targetFilePath, 'r+', 0o666);
            const fstat = fs.fstatSync(fd),
                size = fstat.size,
                isFile = fstat.isFile();
            if (!isFile)
                throw new Error(`${targetFilePath} not a file!`);
            try {
                shred(fd, size, sh.opts);
                if (unlink)
                    fs.unlinkSync(targetFilePath);
            } catch (err) {
                throw err;
            } finally {
                fs.closeSync(fd);
            }
        },

        /**
         * Shreds target files using specified strategy.
         * @param {string|string[]} target path to target directory or array of file paths
         * @param {Object} opts mass shred options
         * @param {boolean} [opts.recursive] whether also subdirectories should be shredded. Defaults to false
         * @param {boolean} [opts.unlink] whether the file should also be unlinked. False by default
         */
        shredAll: (target, {recursive, unlink}) => {
            target = Object.freeze(sh.getTargets(target, recursive));
            if (!target) {
                throw new Error('Invalid params at shred all function. Argument must be a string or an array.');
            }
            const shredFunc = (shredFileList) => {
                const currentTime = Date.now();
                let done = 0;
                shredFileList.forEach(fpath => {
                    sh.shredOne(fpath, unlink);
                    sh.opts.log(`(${++done}/${shredFileList.length})\tShredded ${fpath}`);
                });
                const elapsed = Date.now() - currentTime;
                sh.opts.log(`Shredding took ${elapsed}ms, that is ${elapsed / 1000}s.`)
            };
            shredFunc(target);
        },
        /**
         * Lists targets that would be shredded by shredAll function.
         * @param {string|string[]} target path to target directory or array of file paths
         * @param recursive whether also subdirectories should be shredded. Defaults to false
         * @returns {null|string[]}
         */
        getTargets: (target, recursive) => {
            if (typeof target === 'string')
                return sh.opts.fileLister.listFiles(target, recursive);
            else if (Array.isArray(target)) {
                return target
            } else return null
        }
    };
    if (opts)
        Object.keys(opts).forEach(k => sh.opts[k] = opts[k]);
    return sh;
}

module.exports = {createShredder, strategies};