'use strict';

const Group = require('../models/Group');
const RulesRepository = require('../storage/rulesRepository');
const AttributeConceptsRepository = require('../storage/attributeConceptsRepository');
const Rule = require('../models/rule');
const TraitRule = require('../models/traitRule');
const RuleCondition = require('../models/ruleCondition');

/**
 * This class creates rules of specific types
 */
class RulesFactory {
    constructor() {
        this.attributeConcepts = null;
    }

    createRulesForEventAsync(session, event) {
        
        let groupName = session.groupId;
        let speciesName = event.context.species;

        // if (event.isMatch('USER', 'CHANGED', 'ALLELE')) {
        //     //evaluator = new Evaluator();
        // } else if (event.isMatch('USER', 'SELECTED', 'GAMETE')) {
        //     //evaluator = new Evaluator();
        //if (event.isMatch('USER', 'SUBMITTED', 'ORGANISM')) {
        //     return this._loadAttributeConceptsAsync(session, groupName, speciesName)
        //        .then(() => this._createTraitMatchRules(speciesName));
        // } else {
            let evaluatorTags = event.action.toLowerCase() + ", " + event.target.toLowerCase();
            return this._loadRulesFromSheetAsync(session, session.groupId, evaluatorTags);
        //}
        //else if (event.isMatch('USER', 'SUBMITTED', 'EGG')) {
        //     //evaluator = new OrganismEvaluator();
        // } else if (event.isMatch('USER', 'BRED', 'CLUTCH')) {
        //     //evaluator = new Evaluator();
        // } else if (event.isMatch('USER', 'CHANGED', 'PARENT')) {
        //     //evaluator = new Evaluator();
        // } else if (event.isMatch('USER', 'SELECTED', 'OFFSPRING')) {
        //     //evaluator = new Evaluator();
        // } else if (event.isMatch('USER', 'SUBMITTED', 'PARENTS')) {
        //     //evaluator = new Evaluator();
        // } else {
        //     throw new Error("Unable to find evaluator for event: " + event.toString());
        // }

    }

    _loadAttributeConceptsAsync(session, groupName, speciesName) {
        if (this.attributeConcepts != null) {
            return Promise.accept();
        } else {
            let attributeConceptsRepository;
            return Group.findOne({ "name": groupName }).then((group) => {
                if (!group) {
                    throw new Error("Unable to find group with name: " + groupName);
                }

                let tags = speciesName + ", attribute-concepts";
                let ids = group.getCollectionIds(tags);
                
                if (ids.length == 0) {
                    session.warningAlert("Unable to find attribute concepts sheet for [" + tags + "] defined in '" + groupName + "' group");
                }

                attributeConceptsRepository = new AttributeConceptsRepository(global.cacheDirectory);
                return attributeConceptsRepository.loadCollectionsAsync(ids, group.cacheDisabled);
            }).then(() => {
                if (attributeConceptsRepository) {
                    this.attributeConcepts = attributeConceptsRepository.objs;
                }
            })
        }
    } 

    _loadRulesFromSheetAsync(session, groupName, tags) {
        let rulesRepository = new RulesRepository(global.cacheDirectory);
        return Group.findOne({ "name": groupName }).then((group) => {
            if (!group) {
                throw new Error("Unable to find group with name: " + groupName);
            }

            let ids = group.getCollectionIds(tags);
            
            this.ruleSourceUrls = ids.map((id) => {
                return rulesRepository.getGoogleSheetUrl(id);
            });

            if (ids.length == 0) {
                session.warningAlert("No rules sheets specified for [" + tags + "] in '" + groupName + "' group.");
            }

            return rulesRepository.loadCollectionsAsync(ids, group.cacheDisabled);
        })
        .then(() => rulesRepository.objs);
    }   

    _createTraitMatchRules(species) {
        let rules = [];

        var concepts = {};
        concepts["LG20.0"] = true;
        concepts["LG30.0"] = false;

        let rule = new TraitRule(
            "Generated",
            0, 
            "forelimbs",
            "Forelimbs",
            concepts);

        rules.push(rule);
        return rules;
    }

    static CreateTraitChangeRule(species, trait) {

    }

    static CreateSexMatchRule(species) {

    }

    static CreateSexChangeRule(species) {

    }

    static CreateBreedRule(species, trait) {

    }

    static CreateParentChangeRule(species, trait) {

    }
}

module.exports = RulesFactory;