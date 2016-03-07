'use strict';

const jpaths = {
    nmr: ['$content', 'spectra', 'nmr']
};

module.exports = {
    nmr: function (doc, content, customMetadata) {
        process(doc, content, customMetadata, 'nmr');
    }
};

function process(doc, content, customMetadata, type) {
    let metadata = {};
    let filename = content.filename;
    let reference = filename;
    reference = reference.replace(/\.[0-9]+$/, '');
    const extension = reference.replace(/(.*)\.(.*)/, '$2');
    reference = reference.replace(/(.*)\.(.*)/, '$1');

    let property;
    switch(extension.toLowerCase()) {
        case 'jdx': case 'dx':
            if(type === 'nmr') {
                const isFid = /[^a-z]fid[^a-z]/i.test(filename);
                const isFt = /[^a-z]ft[^a-z]/i.test(filename);
                if(isFid) {
                    reference = reference.replace(/[^a-z]fid[^a-z]?/i, '');
                    property = 'jcampFID';
                    break;
                } else if(isFt) {
                    reference = reference.replace(/[^a-z]ft[^a-z]?/i, '');
                    property = 'jcampFT';
                    break;
                }
                metadata = getNmrMetadata(content.data);
            }
            property = 'jcamp';
            break;
        case 'zip':
            property = 'zip';
            break;
        case 'pdf':
            property = 'pdf';
            break;
        default:
            property = 'file';
            break;
    }

    const nmr = createFromJpath(doc, jpaths['nmr']);

    // process
    metadata[property] = {
        filename: content.filename
    };
    metadata.reference = reference;

    const nmrEntry = nmr.find(nmr => {
        return nmr.reference === reference
    });
    if(nmrEntry) {
        Object.assign(nmrEntry, metadata, customMetadata);
    } else {
        Object.assign(metadata, customMetadata);
        nmr.push(metadata);
    }

    console.log(JSON.stringify(doc, null,'\t'));
    return doc;
}

function createFromJpath(doc, jpath) {
    if(!jpath) throw new Error('createFromJpath: undefined jpath argument');
    for (let i = 0; i < jpath.length; i++) {
        if (doc[jpath[i]] === undefined) {
            if (i !== jpath.length - 1) {
                doc[jpath[i]] = {};
            } else {
                doc[jpath[i]] = [];
            }
        }
        doc = doc[jpath[i]];
    }
    return doc;
}

function getFromJpath(doc, jpath) {
    for (let i = 0; i < jpath.length; i++) {
        if (doc[jpath[i]] === undefined) {
            if (i !== jpath.length - 1) {
                doc[jpath[i]] = {};
            } else {
                doc[jpath[i]] = [];
            }
        }
        doc = doc[jpath[i]];
    }
    return doc;
}

var anReg = /[0-9]{5,}/;
function getNmrMetadata(filecontent) {
    var metadata = {
        nucleus: []
    };

    var line;
    if (line = getLineIfExist(filecontent, '##.SOLVENT NAME= ')) {
        metadata.solvent = line;
    }
    if (line = getLineIfExist(filecontent, '##.PULPROG= ')) {
        metadata.pulse = line;
    } else if (line = getLineIfExist(filecontent, '##.PULSE SEQUENCE= ')) {
        metadata.pulse = line;
    }
    if (line = getLineIfExist(filecontent, '##.OBSERVE FREQUENCY= ')) {
        metadata.frequency = parseFloat(line);
    }
    if (line = getLineIfExist(filecontent, '##.TE= ')) {
        metadata.temperature = parseFloat(line);
    }
    if (line = getLineIfExist(filecontent, '##NUM DIM= ')) {
        metadata.dimension = parseInt(line);
    } else {
        metadata.dimension = 1;
    }
    if (metadata.dimension === 1) {
        if (line = getLineIfExist(filecontent, '##.OBSERVE NUCLEUS= ')) {
            metadata.nucleus.push(line.replace('^', ''));
        }
    } else {
        if (line = getLineIfExist(filecontent, '##.NUCLEUS= ')) {
            var split = line.split(',');
            for (var j = 0; j < split.length; j++) {
                metadata.nucleus.push(split[j].trim());
            }
        }
    }
    if (line = getLineIfExist(filecontent, '##TITLE=')) {
        var resReg = anReg.exec(line);
        metadata.title = resReg ? parseInt(resReg[0]) : -1;
    }
    if (line = getLineIfExist(filecontent, '$$ Date_')) {
        var date = line.trim();
        var theDate = new Date(0);
        theDate.setDate(parseInt(date.substr(-2, 2)));
        theDate.setMonth(parseInt(date.substr(-4, 2)) - 1);
        theDate.setYear(parseInt(date.substr(0, date.length - 4)));
        if (line = getLineIfExist(filecontent, '$$ Time')) {
            date = line.trim().split('.');
            theDate.setHours(parseInt(date[0]));
            theDate.setMinutes(parseInt(date[1]));
        }
        metadata.date = theDate;
    }

    return metadata;
}

function getLineIfExist(str, prefix) {
    var line = str.indexOf(prefix);
    if (line > -1) {
        return str.substring(line + prefix.length, str.indexOf('\n', line)).trim();
    }
}
