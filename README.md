# kx-shredder-sync

Synchronous file shredder.

## Examples:

```javascript
const Shredder = require('@kxghnpm/kx-shredder-sync');
const shr = Shredder.createShredder({
    strategy: Shredder.strategies.ZERO_BYTES
});
shr.shredAll(`my/target/folder`, {recursive: true, unlink: false});
```

```javascript
const Shredder = require('@kxghnpm/kx-shredder-sync');
const shr = Shredder.createShredder({
    strategy: Shredder.strategies.FF_BYTES
});
shr.shredAll(['tests/xxx.txt', 'tests/xxf/xxx.txt'], {unlink: true});
```

```javascript
const shr = require('@kxghnpm/kx-shredder-sync').createShredder();
shr.shredOne('mycv.pdf');
```

## API

```javascript
const Shredder = require('@kxghnpm/kx-shredder-sync');
const shr = Shredder.createShredder({
    /// ... opts ...
    strategy: Shredder.strategies.US_DOD,
    log: console.log,
    passCount: 2
});
```

### strategies

File shredding strategies. If none provided, falls back to US_DOD. Four available:
* ZERO_BYTES fills file with zeros
* FF_BYTES fills file with max byte values
* RANDOM_BYTES fills file with random bytes
* US_DOD all of the previous three as one pass (in that order). 

### createShredder

Accepts the following params:
* `fileLister` filelister with a listFiles(targetDirectoryPath, recursive) method. It recursively searches for files to 
be shredded. Default used filelister is @kxghnpm/kx-file-lister-sync with the following blacklist of file extensions:
`['.exe', '.dll', '.so', '.dat', '.xml', '.js', '.log', '.o', '.efi', '.prx', '.sh', '.rs', '.bat']`
* `bufferSize` write buffer chunk size in bytes. Defaults to 65536 
* `strategy` see strategies above. Defaults to US_DOD
* `log` logger function that will be passed a string indicating progress of mass shredding. Defaults to empty function.
* `passCount` how many times should shredding strategy be used on a file. Suggested and default value is 1.

Returns an object with following functions:

### shredOne

Synchronously shreds a file. Args:
* `targetFilePath` path to file to be shredded 
* `unlink` whether the file should also be unlinked. False by default. 

### shredAll

Synchronously shreds files in (sub)folder(s) or file paths listed in array.
* `target` directory path or array of file paths
* `opts.recursive` whether also files in subdirectories should be shredded. Defaults to false
* `opts.unlink` whether the files should also be unlinked. False by default

### getTargets

Lists targets that would be shredded by shredAll function. Useful for prompting user before shredding recursively.
* `target` target path to target directory or array of file paths
* `recursive` whether also subdirectories should be shredded. Defaults to false