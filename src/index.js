import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import OpenSnapper from './OpenSnapper.png'
import ClosedSnapper from './ClosedSnapper.png'

class Question extends React.Component {
    render() {
        return (
            <div className = "Question">
                {this.props.title_text}
            </div>
        )
    }
}

class ResponseBox extends React.Component {
    render() {
        const selectedResponses = this.props.selectedResponses;
        console.log(selectedResponses);
        const responses = this.props.responses.map(response => {
            return (
                <ResponseButton
                response_text = {response}
                key = {response}
                isSelected = {selectedResponses.includes(response)}
                onClick={() => this.props.onClick(response)}
                />
            )
        });    
        return (
            <div className = 'ResponseBox'>
                {responses}
            </div>
        )
    }
}

class ResponseButton extends React.Component {
    render() {
        return (
            <div className = 'ResponseButtonContainer'
            onClick = {this.props.onClick}>
                <img src = {this.props.isSelected ? ClosedSnapper : OpenSnapper}
                className = 'SnapperImage'
                alt = 'Error: Image not loaded'/>

                <div className = 'ResponseButtonText'>{this.props.response_text}</div>
            </div>
            
        )
    }
}

class NextButton extends React.Component {
    render() {
        return(
            <div className = 'NextButton'
            onClick = {() => this.props.onClick()}>
                Next
            </div>
        )
    }
}

class RecommendationsBox extends React.Component {
    render() {
        if (this.props.recommendations.length > 0) {
            const recommendations = this.props.recommendations.map(recommendation => {
                return(
                    <Recommendation key = {recommendation['Title']}
                    data = {recommendation} />
                )
            });
            return (
                <div className = 'RecommendationsBox'>
                    {recommendations}
                </div>
            )
        }
        else {
            return(
                <div>No recommendations found!</div>
            )
        }
    }
}

class Recommendation extends React.Component {
    render() {
        const data = this.props.data;
        return (
            <div className = 'RecommendationContainer'>
                <img src = {OpenSnapper}
                className = 'SnapperImage'
                alt = 'Error: Image not loaded'/>

                <div className = 'RecommendationData'>
                    <div>
                        <img className ='PosterImage' 
                        src = {data['Poster']} 
                        alt = 'No image found'/>
                    </div>

                    <div className = 'RecommendationTextDiv'>
                        <b>{this.props.data['Title']}</b>
                        <p>IMDB rating = {data['imdbRating']}</p>
                        <p>{data['Plot']}</p>
                    </div>
                    
                    
                </div>
            </div>
        )
    }
}

class PoolSizeBox extends React.Component {
    render() {
        return (
            <div className = 'PoolSizeBox'>
                Sampling from {this.props.pool_size} films!
            </div>
        )
    }
}

class SuggestrApp extends React.Component {
    // Initialise the state
    constructor(props) {
        super(props);
        this.state = {
            question_number: 0,
            pool_size: 10081,
            completed_all_qs: false,
            got_responses: false,
            all_questions: {
                "0":{
                    "Question":  "Answer 10 questions and get a film you actually want to watch!",
                    "Responses": ["Begin"]
                }
            }
        };
    }

    // Get all questions on first mount
    componentDidMount() {
        this.getQuestions();
        document.title = "Suggestr";
    }

    getQuestions = () => {
        fetch('/api/getAllQuestions')
        .then((response) => response.json())
        .then((data) => {
            this.setState({ all_questions: data }, () => {
                console.log('Questions loaded');
            });
        });
    }
    
    getPoolSize = () => {
        const all_questions = this.state.all_questions;
        fetch('/api/getPoolSize', {
            method: 'post',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
            body: JSON.stringify(all_questions),
        })
        .then((response) => response.json())
        .then((data) => {
            this.setState({
                pool_size: data['pool_size']
            })
        })
        .catch((error) => {
            console.error('Error', error);
        })
    }

    getRecommendations = () => {
        const all_questions = this.state.all_questions;
        fetch('/api/getAllRecommendations', {
            method: 'post',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
            body: JSON.stringify(all_questions),
        })
        .then((response) => response.json())
        .then((data) => {
            this.setState({
                got_responses: true,
                recommendations: data
            })
        })
        .catch((error) => {
            console.error('Error', error);
        })
    }

    // Get responses for dynamic questions
    getResponses() {

    }

    handleClick(response) {
        // Deal with multiple reponse questions differently to single response questions
        const cur_q_num = this.state.question_number;
        const cur_q_num_str = this.state.question_number.toString();
        const cur_all_qs = this.state.all_questions;
        const cur_q = cur_all_qs[cur_q_num_str];
        const cur_q_multiple_responses = cur_q['Multiple responses']

        if(cur_q_multiple_responses) {
            // Go to next question if next button selected, don't need to update responses (add check for any response)
            if (response == 'Next') {
                // Check that we haven't reached the end of the questions and update this.state.completed_all_qs if so
                if(cur_q_num === 7) {
                    this.setState({completed_all_qs: true});
                    this.getRecommendations();
                }
                else {
                    this.setState( {question_number: cur_q_num + 1} );
                }
            } else {
                // Add response to array in current question
                if('User response' in cur_q) {
                    // Check if response already in user response and remove it if so
                    if(cur_q['User response'].includes(response)) {
                        // Remove response for user response
                        var new_responses = cur_q['User response'];
                        new_responses = new_responses.filter(e => e !== response);
                        var new_all_qs = cur_all_qs;
                        new_all_qs[cur_q_num_str]['User response'] = new_responses;
                    } else {
                        var new_responses = cur_q['User response'];
                        new_responses.push(response);
                        var new_all_qs = cur_all_qs;
                        new_all_qs[cur_q_num_str]['User response'] = new_responses;
                    }               
                } else {
                    // Create array with one element of the first response
                    var new_all_qs = cur_all_qs;
                    new_all_qs[cur_q_num_str]['User response'] = [response];
                }
                this.setState({all_questions: new_all_qs});
            }
        } else {
             // Add user response to all_questions and update question_number when an option is selected
            var new_all_qs = cur_all_qs;
            new_all_qs[cur_q_num_str]['User response'] = response;
            // var response_index = cur_all_qs[cur_q_num_str]['Responses'].indexOf(response);
            // new_all_qs[cur_q_num_str]['User response index'] = response_index;
                    
            // Check that we haven't reached the end of the questions and update this.state.completed_all_qs if so
            if(cur_q_num === 7) {
                this.setState({completed_all_qs: true});
                this.getRecommendations();
            }
            else {
                this.setState( {all_questions: new_all_qs} );
                this.setState( {question_number: cur_q_num + 1} );
            } 
        }
        
        this.getPoolSize();
    }

    render() {
        const completed_all_qs = this.state.completed_all_qs;
        const got_responses = this.state.got_responses;
        const recommendations = this.state.recommendations;
        if(completed_all_qs) {
            if(got_responses) {
                return (
                    <div className = 'SuggestrApp'>
                        <Question title_text='Recommendations'/>
                        <RecommendationsBox
                        recommendations = {recommendations}
                        />
                    </div>
                )
            } else {
                return (
                    <div className ='LoadingResponses'>Loading responses</div>
                )
            }
        } else {
            const all_qs = this.state.all_questions;
            const q_num = this.state.question_number;
            const q = all_qs[q_num.toString()];
            const q_text = q['Question'];
            const multiple_responses = q['Multiple responses'];
            const responses_arr = q['Responses'];
            const pool_size = this.state.pool_size;


            if(multiple_responses) {
                return(
                    <div className = 'SuggestrApp'>
                        <Question title_text={q_text}/>
                        <PoolSizeBox pool_size={pool_size}/>
                        <ResponseBox responses={responses_arr}
                        selectedResponses = {'User response' in q ? q['User response'] : []}
                        onClick = {response => this.handleClick(response)}/>
                        <NextButton onClick = {() => this.handleClick('Next')}/>
                    </div>
                )
            } else {
                return(
                    <div className = 'SuggestrApp'>
                        <Question title_text={q_text}/>
                        <PoolSizeBox pool_size={pool_size}/>
                        <ResponseBox responses={responses_arr}
                        selectedResponses = {[]}
                        onClick = {response => this.handleClick(response)}/>
                    </div>
                ) 
            }     
        }
        
    }
}

ReactDOM.render(
    <SuggestrApp />,
    document.getElementById('root')
)

