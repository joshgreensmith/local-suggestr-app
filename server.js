//server.js
const express = require('express');
const favicon = require('express-favicon');
const path = require('path');
// const port = process.env.PORT || 8080;
const port = 8080;
const app = express();

// Custom modules for data processing
const bodyParser = require('body-parser');
const _ = require('underscore');
const fs = require('fs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Test ping route
app.get('/ping', function (req, res) {
    console.log('Ping request received!');
    return res.send('pong');
});

// Route to get all questions from the question file
app.get('/api/getAllQuestions', function(request, response) {
    var questions_raw = fs.readFileSync('all_questions_new.json');
    var questions_json = JSON.parse(questions_raw);
    response.send(questions_json);
});

// Return true or false on whether to ignore id from recommendations pool
// Go through each question response, check if answered and see if it should be ignored
function ignore_id(movie, questions) {
    // Age rating
    if('User response' in questions['1']) {
        if(!(questions['1']['User response'] == "Don't mind")) {
            if(movie['Rated'] == 'PG-13') {
                if(!(questions['1']['User response'] == 'PG-13')) {return [true, 1]}
            }
            if(movie['Rated'] == 'R') {
                if(!(questions['1']['User response'] == 'R')) {return [true, 1]}
            }
        }      
    }

    // Genre
    var test_genre;
    var found_genre = false;
    if('User response' in questions['2']) {
        for(i = 0; i < questions['2']['User response'].length; i++) {
            test_genre = questions['2']['User response'][i];
            if(movie['Genre'].includes(test_genre)) {found_genre = true}
        }
        if(!(found_genre)) {return [true, 2]}
    }

    // Film length
    if('User response' in questions['3']) {    
        var runtime = movie['Runtime']
        var lower = questions['3']['User response'][0]
        var upper = questions['3']['User response'][1]
        if(!(runtime >= lower && runtime <= upper)) {return [true, 3]}
    }

    // Language
    var found_language = false;
    if('User response' in questions['4']) {
        for(i = 0; i < questions['4']['User response'].length; i++) {
            test_language = questions['4']['User response'][i]
            if(movie['Language'].includes(test_language)) {found_language = true}
        }
        if(!(found_language)) {return [true, 4]}
    }

    // Film year slider bound
    if('User response' in questions['5']) {
        var lower = questions['5']['User response'][0];
        var upper = questions['5']['User response'][1];
        var year = movie['Year'];
        if(!(year >= lower && year <= upper)) {return [true, 5]}
    }

    // Imdb rating
    if('User response' in questions['6']) {
        var lower = questions['6']['User response'][0];
        var upper = questions['6']['User response'][1];
        var imdbRating = movie['imdbRating'];
        if(!(imdbRating >= lower && imdbRating <= upper)) {return [true, 6]}
    }

    // Mainstream studio
    if('User response' in questions['7']) {
        if(!(questions['7']['User response'] == "Don't mind")) {
            if(questions['7']['User response'] == 'Yes') {
                if(!(movie['BigFiveStudio'])) {return [true, 7]}
            }
            if(questions['7']['User response'] == 'No') {
                if(movie['BigFiveStudio']) {return [true, 7]}
            }
        }    
    }

    // Oscar nominated
    if('User response' in questions['8']) {
        if(!(questions['8']['User response'] == "Don't mind")) {
            if(questions['8']['User response'] == 'Yes') {
                if(!(movie['OscarNominated'])) {return [true, 8]}
            }
            if(questions['8']['User response'] == 'No') {
                if(movie['OscarNominated']) {return [true, 8]}
            }
        }    
    }

    return false
}

function get_recommend_data(imdb_ids) {
    recommend_data = []

    var recc_db = JSON.parse(fs.readFileSync('db/recc_db_v1.json'));

    for(i = 0; i < imdb_ids.length; i++) {
        imdbID = imdb_ids[i];
        recommend_data.push(recc_db[imdbID]);
    }

    return recommend_data
}
// Route to get recommended films based on question answers given back
app.post('/api/getAllRecommendations', function(request, response) {
    const questions = request.body;
    
    var movies = JSON.parse(fs.readFileSync('db/core_db_v6.json'));
    const number_of_movs_in_db = Object.keys(movies).length;

    var imdbIDs_to_ignore = [];
    var movie;
    var ignore_id_test;
    // Overall loop through movies to reduce processing time overall - change fxn to process one film maybe
    for(const [imdbID, movie] of Object.entries(movies)) {
        console.log(imdbID, movie['title']);
        ignore_id_test = ignore_id(movie, questions);

        if(ignore_id_test[0]) {
            imdbIDs_to_ignore.push(imdbID);
        }
    }

    // Work out which titles to return based on question responses
    ids_to_recommend = []
    for(const [imdbID, movie] of Object.entries(movies)) {
        if(!(imdbIDs_to_ignore.includes(imdbID))) {
            ids_to_recommend.push(imdbID);
        }
    }

    // If more than 6 movies returned, randomly choose 6 movies to show
    if(ids_to_recommend.length > 6) {
        ids_to_recommend = _.shuffle(ids_to_recommend).slice(0,6);
    }

    recommend_data = get_recommend_data(ids_to_recommend)

    response.send(recommend_data);
});

// Route to get recommended films based on question answers given back
app.post('/api/getPoolSize', function(request, response) {
    const questions = request.body;
    
    var title_json = JSON.parse(fs.readFileSync('db/title_db.json'));
    var movies = JSON.parse(fs.readFileSync('db/core_db_v6.json'));
    const number_of_movs_in_db = Object.keys(movies).length;

    var imdbIDs_to_ignore = [];

    var ignore_id_test;
    // Overall loop through movies to reduce processing time overall - change fxn to process one film maybe
    for(const [imdbID, movie] of Object.entries(movies)) {
        ignore_id_test = ignore_id(movie, questions);
        if(ignore_id_test[0]) {
            imdbIDs_to_ignore.push(movie['imdbID']);
        }
    }

    var pool_size = number_of_movs_in_db - imdbIDs_to_ignore.length
    response.send({pool_size});
});

// Listen on port given by Heroku or the local port
app.listen(port);