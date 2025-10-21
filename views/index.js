document.addEventListener('DOMContentLoaded', () =>{
    const list = document.getElementById('list')

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('task-date').value = today;

    list.addEventListener('submit', async (e) =>{
        e.preventDefault()
        const formdata = new FormData(list)

        const task = formdata.get('task').trim()
        const date = formdata.get('date')

        if (!task) {
            alert('Please enter a task.');
            return;
        }

        try {
            const response = await fetch('/todo/add', {
                method: 'POST',
                headers:{
                    "content-type" : 'application/json'
                },
                body:JSON.stringify({task,date})
            })
            if(response.ok){
                alert('list added')
                list.reset()
                document.getElementById('task-date').value = today;
            }else{
                alert('list not added')
            
            }
        } catch (error) {
           console.error('Error' +error) 
        }
        
    })
    
})