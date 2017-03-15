const biologica = require('../shared/biologica.js');
const biologicaX = require('../shared/biologicax.js');
const concept = require('../models/Concept');
const parse = require('csv-parse');
const fs = require('fs');
const EcdRulesRepository = require("../controllers/ecdRulesRepository");

var EcdRules = module.exports = {
  evaluateOrganismSubmission: function(
        student,
        groupId,
        challengeId,
        correct,
        editableGenes,
        speciesName,
        correctPhenotype,
        initialAlleles,
        selectedAlleles,
        targetSex) {

    console.info("Update student model for: %s (%s | %s)", student.id, groupId, challengeId);
    var repo = new EcdRulesRepository();
    return repo.findEcdMatrix(groupId, challengeId).then((ecdMatrix) => { 
        if (!ecdMatrix) {
            throw new Error("Unable to find group (" + groupId + ") or challenge (" + challengeId + ")");
        }
        console.info("Loaded: " + ecdMatrix);
        conceptMatrix = ecdMatrix;

        var hints = [];

        var targetSpecies = BioLogica.Species[speciesName];
        //var targetOrganism = new BioLogica.Organism(targetSpecies, targetAlleles, targetSex);
        //console.log('targetOrganism alleles: ' + targetOrganism.getAlleleString());
        //console.log('targetOrganism : ' + targetOrganism.getAlleleString());

        var minConceptValue = 999999;

        // Iterate over the genes that are editable by the student in the UI
        var conceptIdToTrait = {};
        var genesLength = editableGenes.length;
        for (var i = 0; i < genesLength; ++i) {
            var gene = editableGenes[i];
            var alleleA = BiologicaX.findAllele(targetSpecies, selectedAlleles, 'a', gene).replace('a:', '');
            var alleleB = BiologicaX.findAllele(targetSpecies, selectedAlleles, 'b', gene).replace('b:', '');
            var targetCharacteristic = BiologicaX.getCharacteristicFromPhenotype(correctPhenotype, gene);

            console.info("Update: " + targetCharacteristic);

            //var conceptState = student.conceptState(targetCharacteristic, conceptId);

            // Iterate over the global list of concepts and update the student model based on 
            // there allele selection and the target characterisitic. E.g., they're trying to 
            // produce wings, what did they they set the alleles to? What does this imply 
            // in terms of the student's knowledge of concepts?
            // var concepts = concept.getAll();
            // var conceptIds = concepts.map(function(a) {return a.Id;});
            // conceptIds.forEach(function (conceptId) {
            
            //     var conceptAdjustAndHints = getConceptAdjustment(conceptMatrix, targetCharacteristic, alleleA, alleleB, conceptId);
            //     console.log('Adjust concept "' + conceptId + '" by ' + conceptAdjustAndHints.adjustment);   

            //     var conceptState = student.conceptState(conceptId);
            //     conceptState.value += conceptAdjustAndHints.adjustment;  
            //     console.info("Concept: " + conceptId + " = " + conceptState.value);
            //     if (conceptAdjustAndHints.adjustment < minConceptValue) {
            //         minConceptValue = conceptAdjustAndHints.adjustment;
            //         if (conceptAdjustAndHints.hints.length > 0) {
            //             hints = conceptAdjustAndHints.hints;
            //         }
            //     }

                // if (adjustment != null && adjustment < 0) {
                //   if (!conceptIdToTrait.hasOwnProperty(conceptId)) {
                //     conceptIdToTrait[conceptId] = {
                //       trait: gene,
                //       adjustment: 0
                //     };  
                //   }
                //   if (adjustment < conceptIdToTrait[conceptId].adjustment) {
                //     conceptIdToTrait[conceptId].adjustment = adjustment;
                //   }
                // }
            //});
        }

        return "Hello World!";
    });
}
}


function getConceptAdjustment(conceptMatrix, targetCharacteristic, alleleA, alleleB, conceptId) {
    
    console.log('targetCharacteristic:' + targetCharacteristic + '  alleleA:' + alleleA + '  alleleB:' + alleleB + '  conceptId:' + conceptId);

    var targetCharacteristicIndex = -1;
    var alleleAIndex = -1;
    var alleleBIndex = -1;
    var hint1Index = -1;
    var conceptIdIndex = -1;
    var columnCount = conceptMatrix[0].length;
    for (var i = 0; i < columnCount; ++i) {
        var header = conceptMatrix[0][i];
        if (header.toLowerCase() == 'InheritancePattern'.toLowerCase()) {
            // Ignore
        } else if (header.toLowerCase() == 'Target'.toLowerCase()) {
            targetCharacteristicIndex = i;
        }
        else if (header.toLowerCase() == 'Allele-A'.toLowerCase()) {
            alleleAIndex = i;
        }
        else if (header.toLowerCase() == 'Allele-B'.toLowerCase()) {
            alleleBIndex = i;
        }   
        else if (header.toLowerCase() == 'Hint-1'.toLowerCase()) {
            hint1Index = i;
        }    
        else if (header.toLowerCase().includes('hint')) {
            // Ignore
        } 
        // If the heading isn't one of the previous headings, it must be a concept 
        else if (header == conceptId) {
            conceptIdIndex = i;
        }                    
    }

    var conceptAdjustmentAndHints = {   
        adjustment: 0,
        hints: []
    };

    if (conceptIdIndex < 0) {
        console.warn('No adjustment defined for: ' + conceptId);
        return conceptAdjustmentAndHints;
    }

    var adjustment = 0;
    var hints = [];

    var rowCount = conceptMatrix.length;
    for (var i = 1; i < rowCount; ++i) {
        var row = conceptMatrix[i];
        if (row[targetCharacteristicIndex].toLowerCase() == targetCharacteristic.toLowerCase()
            && row[alleleAIndex] == alleleA
            && row[alleleBIndex] == alleleB) {
                conceptAdjustmentAndHints.adjustment = (row[conceptIdIndex] ? Number(row[conceptIdIndex]) : 0);
                if (hint1Index >= 0) {
                    conceptAdjustmentAndHints.hints = [
                        row[hint1Index],
                        row[hint1Index + 1],
                        row[hint1Index + 2]
                    ];
                }
                else {
                    conceptAdjustmentAndHints = [];
                }
                return conceptAdjustmentAndHints;
            }
    }

    return {   
        adjustment: 0,
        hints: []
    };
}